import React from 'react';
import TodoList from './TodoList.js';

function BoardComponent() {
  return (
    <div style={{
      margin: '20px',
      padding: '20px',
      border: '1px solid #333',
      borderRadius: '8px',
      backgroundColor: '#fff',
      color: '#000'
    }}>
      <h3 style={{ color: '#000', marginBottom: '15px' }}>Zoho Tasks</h3>

      {/* Todo List with task management */}
      <TodoList />
    </div>
  );
}

export default BoardComponent;