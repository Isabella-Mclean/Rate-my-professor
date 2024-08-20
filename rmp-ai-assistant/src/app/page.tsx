'use client'
import { AppBar, Box, Button, Stack, TextField, Typography, Toolbar, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
import { useState } from 'react'

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi! I'm the Rate My Professor support assistant. How can I help you today?`,
    },
  ])
  const [message, setMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false) // State to manage modal open/close
  const [profPage, setProfPage] = useState('') // State to store professor page URL

  const sendMessage = async () => {
    setMessage('')
    setMessages((messages) => [
      ...messages,
      { role: 'user', content: message },
      { role: 'assistant', content: '' },
    ])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([...messages, { role: 'user', content: message }]),
      })

      if (!response.body) {
        throw new Error('Response body is null')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let result = ''

      const processText = async ({ done, value }: ReadableStreamReadResult<Uint8Array>): Promise<string> => {
        if (done) {
          return result
        }

        const text = decoder.decode(value || new Uint8Array(), { stream: true })
        result += text

        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1]
          let otherMessages = messages.slice(0, messages.length - 1)
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ]
        })

        const nextResult = await reader.read()
        return processText(nextResult)
      }

      await reader.read().then(processText)
    } catch (error) {
      console.error('Error fetching message:', error)
    }
  }

  const addProfReview = async () => {
    try {
      const response = await fetch('/api/addProf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profPage }),
      })

      if (!response.body) {
        setProfPage('')
        alert("Professor page not added")
        throw new Error('Response body is null')
      } else {
        console.log("success")
        setProfPage('')
        alert("Professor page added")
      }
    } catch {
      console.log("error")
      setProfPage('')
      alert("Professor page not added")
    } 
  }

  const handleModalOpen = () => {
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
  }

  return (
    <Box
      className="flex flex-col items-center justify-center w-screen h-screen bg-gradient-to-r from-gray-900 to-gray-700 overflow-hidden"
      sx={{ overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}
    >
      <AppBar className='bg-gradient-to-r from-gray-900 to-gray-700' position="static" sx={{ minWidth: '100vw' }}>
        <Toolbar sx={{ minWidth: '100vw' }}>
          <Typography
            variant="h6"
            padding='20px'
            sx={{ minWidth: '70vw' }}
          >
            Rate my professor
          </Typography>
          <Button className='text-black shadow-md shadow-white bg-slate-600 hover:bg-gray-50' onClick={handleModalOpen}>
            Submit a professor page for review
          </Button>
        </Toolbar>
      </AppBar>
      <Stack
        direction="column"
        width={{ xs: '90%', sm: '80%', md: '500px' }}
        height="80vh"
        border="1px solid"
        borderColor="#3a3a3a"
        p={4}
        spacing={3}
        marginTop={4}
        className="bg-gray-800 rounded-lg shadow-lg relative"
        sx={{
          animation: 'fadeIn 1.5s ease',
        }}
      >
        <Stack
          direction="column"
          spacing={2}
          flexGrow={1}
          overflow="auto"
          maxHeight="100%"
          className="scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-600"
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              display="flex"
              justifyContent={
                message.role === 'assistant' ? 'flex-start' : 'flex-end'
              }
            >
              <Box
                sx={{
                  bgcolor: message.role === 'assistant' ? '#4a4a4a' : '#1a1a1a',
                  color: 'white',
                  borderRadius: '8px',
                  p: 2,
                  maxWidth: '75%',
                  fontSize: '0.9rem',
                  boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                }}
              >
                {message.content}
              </Box>
            </Box>
          ))}
        </Stack>
        <Stack direction="row" spacing={2}>
          <TextField
            placeholder="Type your message..."
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            variant="outlined"
            className="bg-gray-700 rounded-md shadow-inner text-white"
            InputProps={{
              style: {
                borderRadius: '12px',
                color: '#f0f0f0',
              },
            }}
          />
          <Button
            variant="contained"
            onClick={sendMessage}
            className="bg-gray-600 hover:bg-gray-500 shadow-md text-white"
            sx={{
              borderRadius: '12px',
              fontWeight: '500',
            }}
          >
            Send
          </Button>
        </Stack>
      </Stack>

      {/* Modal Component */}
      <Dialog open={modalOpen} onClose={handleModalClose}>
        <DialogTitle>Submit a Professor Page for Review</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Professor Page URL"
            fullWidth
            variant="outlined"
            value={profPage}
            onChange={(e) => setProfPage(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleModalClose} color="primary">
            Cancel
          </Button>
          <Button onClick={() => { addProfReview(); handleModalClose(); }} color="primary">
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
