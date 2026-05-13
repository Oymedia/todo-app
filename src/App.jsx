import { useState, useEffect, useRef } from 'react'
import './App.css'

const STORAGE_KEY = 'todos'

function App() {
  const [todos, setTodos] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : [
        { id: 1, text: 'Buy groceries', done: false },
        { id: 2, text: 'Walk the dog', done: true },
      ]
    } catch {
      return []
    }
  })
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const [input, setInput] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('none')
  const [filter, setFilter] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [dragOverId, setDragOverId] = useState(null)
  const dragId = useRef(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  }, [todos])

  useEffect(() => {
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    document.body.classList.toggle('dark', dark)
  }, [dark])

  const addTodo = (e) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return
    setTodos([...todos, { id: Date.now(), text: trimmed, done: false, dueDate: dueDate || null, priority }])
    setInput('')
    setDueDate('')
    setPriority('none')
  }

  const toggleTodo = (id) => {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const deleteTodo = (id) => {
    setTodos(todos.filter(t => t.id !== id))
  }

  const startEdit = (todo) => {
    setEditingId(todo.id)
    setEditText(todo.text)
  }

  const commitEdit = (id) => {
    const trimmed = editText.trim()
    if (trimmed) {
      setTodos(todos.map(t => t.id === id ? { ...t, text: trimmed } : t))
    }
    setEditingId(null)
  }

  const handleEditKeyDown = (e, id) => {
    if (e.key === 'Enter') commitEdit(id)
    if (e.key === 'Escape') setEditingId(null)
  }

  const PRIORITIES = ['none', 'low', 'medium', 'high']
  const cyclePriority = (id, current) => {
    const next = PRIORITIES[(PRIORITIES.indexOf(current) + 1) % PRIORITIES.length]
    setTodos(todos.map(t => t.id === id ? { ...t, priority: next } : t))
  }

  const clearCompleted = () => {
    setTodos(todos.filter(t => !t.done))
  }

  const handleDragStart = (id) => {
    dragId.current = id
  }

  const handleDragOver = (e, id) => {
    e.preventDefault()
    setDragOverId(id)
  }

  const handleDrop = (targetId) => {
    const from = dragId.current
    if (from === targetId) return
    // Reorder within the full todos array so filtered views don't lose items
    const next = [...todos]
    const fromIdx = next.findIndex(t => t.id === from)
    const toIdx = next.findIndex(t => t.id === targetId)
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    setTodos(next)
    dragId.current = null
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    dragId.current = null
    setDragOverId(null)
  }

  const formatDueDate = (dateStr) => {
    if (!dateStr) return null
    const today = new Date(); today.setHours(0,0,0,0)
    const due = new Date(dateStr + 'T00:00:00')
    const diff = Math.round((due - today) / 86400000)
    if (diff < 0) return { label: `Overdue by ${-diff}d`, status: 'overdue' }
    if (diff === 0) return { label: 'Due today', status: 'today' }
    if (diff === 1) return { label: 'Due tomorrow', status: 'soon' }
    return { label: `Due ${due.toLocaleDateString('en-GB', { day:'numeric', month:'short' })}`, status: 'future' }
  }

  const visible = todos.filter(t => {
    if (filter === 'active') return !t.done
    if (filter === 'done') return t.done
    return true
  })

  const remaining = todos.filter(t => !t.done).length

  return (
    <div className="app">
      <div className="header">
        <h1>Todo</h1>
        <button className="theme-toggle" onClick={() => setDark(d => !d)} aria-label="Toggle dark mode">
          {dark ? '☀️' : '🌙'}
        </button>
      </div>

      <form onSubmit={addTodo} className="add-form">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="What needs to be done?"
          autoFocus
        />
        <input
          type="date"
          className="date-picker"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
        />
        <select
          className="priority-select"
          value={priority}
          onChange={e => setPriority(e.target.value)}
        >
          <option value="none">— Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button type="submit">Add</button>
      </form>

      <ul className="todo-list">
        {visible.length === 0 && (
          <li className="empty">No tasks here.</li>
        )}
        {visible.map(todo => (
          <li
            key={todo.id}
            className={[
              todo.done ? 'done' : '',
              dragOverId === todo.id ? 'drag-over' : '',
            ].join(' ').trim()}
            draggable
            onDragStart={() => handleDragStart(todo.id)}
            onDragOver={e => handleDragOver(e, todo.id)}
            onDrop={() => handleDrop(todo.id)}
            onDragEnd={handleDragEnd}
          >
            {todo.priority && todo.priority !== 'none' && (
              <button
                className={`priority-pill priority-${todo.priority}`}
                onClick={() => cyclePriority(todo.id, todo.priority)}
                aria-label={`Priority: ${todo.priority}`}
              >
                {todo.priority[0].toUpperCase()}
              </button>
            )}
            {(!todo.priority || todo.priority === 'none') && (
              <button
                className="priority-pill priority-none"
                onClick={() => cyclePriority(todo.id, 'none')}
                aria-label="Set priority"
              >·</button>
            )}
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => toggleTodo(todo.id)}
            />
            <div className="todo-body">
              {editingId === todo.id ? (
                <input
                  className="edit-input"
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onBlur={() => commitEdit(todo.id)}
                  onKeyDown={e => handleEditKeyDown(e, todo.id)}
                  autoFocus
                />
              ) : (
                <span onDoubleClick={() => startEdit(todo)}>{todo.text}</span>
              )}
              {todo.dueDate && (() => {
                const d = formatDueDate(todo.dueDate)
                return !todo.done && <span className={`due-badge due-${d.status}`}>{d.label}</span>
              })()}
            </div>
            <button className="delete" onClick={() => deleteTodo(todo.id)} aria-label="Delete">×</button>
          </li>
        ))}
      </ul>

      <div className="footer">
        <span>{remaining} item{remaining !== 1 ? 's' : ''} left</span>
        <div className="filters">
          {['all', 'active', 'done'].map(f => (
            <button
              key={f}
              className={filter === f ? 'active' : ''}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={clearCompleted} disabled={!todos.some(t => t.done)}>
          Clear done
        </button>
      </div>
    </div>
  )
}

export default App
