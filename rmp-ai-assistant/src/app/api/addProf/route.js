import { NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'
import OpenAI from 'openai'
import { comment } from 'postcss'

// System prompt for OpenAI
const systemPrompt = `
You are a rate my professor agent. Given a URL to a professor's page, analyze the page and return a JSON response in the format:
{
    "professor": name[str],
    "subject": str,
    "stars": [1-5]int,
    "review": str
}
`

export async function POST(req) {
    try {
        // Parse the incoming request to get the URL
        const url = await req.json()
        if (!url) {
            return NextResponse.json({ error: 'URL is required.' }, { status: 400 })
        }
        

        // Initialize Pinecone and OpenAI clients
        const pc = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        })
        const index = pc.index('rag').namespace('ns1')
        const openai = new OpenAI()

        // Send the system prompt and the URL to OpenAI to generate the review
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `URL: ${url.profPage}` },
            ],
        })

        // Extract the response from OpenAI
        const reviewResponse = completion.choices[0]?.message?.content
        if (!reviewResponse) {
            return NextResponse.json({ error: 'Failed to get a response from OpenAI.' }, { status: 500 })
        }

        // Parse the JSON response from OpenAI
        let reviewData
        try {
            reviewData = JSON.parse(reviewResponse)
        } catch (error) {
            console.error('Error parsing JSON response:', error)
            return NextResponse.json({ error: 'Failed to parse the review data.' }, { status: 500 })
        }

        if (!reviewData || !reviewData.professor || !reviewData.subject || !reviewData.stars || !reviewData.review) {
            return NextResponse.json({ error: 'Incomplete review data received from OpenAI.' }, { status: 500 })
        }

        // Generate an embedding for the professor's name
        const professorNameEmbeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: [reviewData.professor],
        })

        const professorNameEmbedding = professorNameEmbeddingResponse.data[0].embedding
        if (!professorNameEmbedding) {
            return NextResponse.json({ error: 'Failed to generate professor name embedding.' }, { status: 500 })
        }
        const record = [
            {
                id: reviewData.professor,
                values: professorNameEmbedding,
                metadata: {
                    subject: reviewData.subject,
                    stars: reviewData.stars,
                    review: reviewData.review,
                }
            },
        ]

        // Insert the new review into Pinecone
        await index.upsert(record)
        return NextResponse.json({ message: 'success' })

    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
    }
}
