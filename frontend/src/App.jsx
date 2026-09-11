import './App.css'
import { useState } from 'react'
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/react'
import { Button } from '@heroui/react';

function App() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <h1 className="text-4xl text-red-500 bg-blue-400">My App</h1>

      <header>
        <Show when="signed-out">
          <SignInButton  mode="modal"/>
          <SignUpButton mode="modal"/>
        </Show>

        <Show when="signed-in">
          <UserButton />
        </Show>
      </header>
    </div>
  )
}

export default App