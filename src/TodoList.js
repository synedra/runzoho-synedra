import React, { useState, useCallback, useEffect } from 'react';

function TodoList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState('');

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const userEmail = localStorage.getItem('user_email') || 'synedra@gmail.com';
      console.log('Fetching tasks for user:', userEmail);
      const itemsResponse = await fetch(`/.netlify/functions/zoho-tasks?userId=${encodeURIComponent(userEmail)}`, {
        method: 'GET',
      });
      console.log('Fetch URL:', `/.netlify/functions/zoho-tasks?userId=${encodeURIComponent(userEmail)}`);

      console.log('Items response status:', itemsResponse.status);
      console.log('Items response headers:', Object.fromEntries(itemsResponse.headers.entries()));

      if (!itemsResponse.ok) {
        const errorText = await itemsResponse.text();
        console.log('Items response error:', errorText);
        throw new Error('Failed to fetch items');
      }

      const itemsData = await itemsResponse.json();
      console.log('Items data:', itemsData);

      const boardItems = itemsData.data || [];
      console.log('Found tasks:', boardItems);

      // Transform items to match expected format with column_values
      const transformedItems = boardItems.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        dueDate: item.dueDate,
        priority: item.priority,
        status: item.status,
        owner: item.owner,
        modifiedTime: item.modifiedTime,
        column_values: item.column_values || []
      }));

      console.log('Setting transformed items:', transformedItems);
      setItems(transformedItems);
    } catch (err) {
      console.error('Error fetching items:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const createItem = async () => {
    if (!newItemName.trim()) return;

    try {
      const userEmail = localStorage.getItem('user_email') || 'synedra@gmail.com';
      const response = await fetch(`/.netlify/functions/zoho-tasks?userId=${encodeURIComponent(userEmail)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newItemName }),
      });

      if (!response.ok) {
        throw new Error('Failed to create item');
      }

      setNewItemName('');
      fetchItems(); // Refresh the list
    } catch (err) {
      setError(err.message);
    }
  };

  const updateItem = async (id, name) => {
    try {
      const userEmail = localStorage.getItem('user_email') || 'synedra@gmail.com';
      const response = await fetch(`/.netlify/functions/zoho-tasks?userId=${encodeURIComponent(userEmail)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, name }),
      });

      console.log('Update response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Update response error:', errorText);
        throw new Error(`Failed to update item: ${errorText}`);
      }

      setEditingItem(null);
      setEditName('');
      fetchItems(); // Refresh the list
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteItem = async (id) => {
    console.log('Deleting item:', id);
    try {
      const userEmail = localStorage.getItem('user_email') || 'synedra@gmail.com';
      const response = await fetch(`/.netlify/functions/zoho-tasks?taskId=${id}&userId=${encodeURIComponent(userEmail)}`, {
        method: 'DELETE',
      });

      console.log('Delete response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Delete response error:', errorText);
        throw new Error(`Failed to delete item: ${response.status} - ${errorText}`);
      }

      console.log('Item deleted successfully, refreshing items...');
      fetchItems(); // Refresh the list
    } catch (err) {
      console.error('Error deleting item:', err);
      setError(err.message);
    }
  };

  const toggleDone = async (item) => {
    console.log('Toggling item:', item);
    console.log('Available columns:', item.column_values);
    
    // Find the actual status column (it might have a different ID)
    const statusColumn = item.column_values.find(col =>
      col.id === 'status' || col.text === 'Done' || col.text === 'Working on it' || col.type === 'color'
    );
    
    if (!statusColumn) {
      console.error('No status column found. Available columns:', item.column_values);
      setError('This board does not have a status column');
      return;
    }

    const currentStatus = statusColumn?.text || 'Working on it';
    const newStatus = currentStatus === 'Done' ? 'Working on it' : 'Done';

    console.log('Status column ID:', statusColumn.id);
    console.log('Current status:', currentStatus, 'New status:', newStatus);
    console.log('Task status from item:', item.status);

    try {
      const userEmail = localStorage.getItem('user_email') || 'synedra@gmail.com';
      const columnValues = [
        {
          id: statusColumn.id,
          text: newStatus,
          type: 'status'
        }
      ];
      
      console.log('Sending column values:', columnValues);
      
      const response = await fetch(`/.netlify/functions/zoho-tasks?userId=${encodeURIComponent(userEmail)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: item.id,
          columnValues: columnValues
        }),
      });

      console.log('Toggle response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Toggle response error:', errorText);
        throw new Error(`Failed to update item status: ${errorText}`);
      }

      console.log('Status updated successfully, refreshing items...');
      fetchItems(); // Refresh the list
    } catch (err) {
      console.error('Error toggling item:', err);
      setError(err.message);
    }
  };

  const startEditing = (item) => {
    setEditingItem(item.id);
    setEditName(item.name);
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setEditName('');
  };

  const saveEditing = () => {
    if (editName.trim()) {
      updateItem(editingItem, editName);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '20px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>My Tasks</h2>

      {loading && <p>Loading items...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && items.length === 0 && <p>No items found in this board.</p>}

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder="Add new todo item"
          style={{ padding: '5px', marginRight: '10px', width: '70%' }}
        />
        <button onClick={createItem} style={{ padding: '5px 10px' }}>Add</button>
      </div>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map(item => (
          <li key={item.id} style={{ marginBottom: '15px', padding: '15px', border: '1px solid #eee', borderRadius: '8px', backgroundColor: '#fafafa' }}>
            {editingItem === item.id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ padding: '5px', flex: '1' }}
                />
                <button onClick={saveEditing} style={{ padding: '5px 10px' }}>Save</button>
                <button onClick={cancelEditing} style={{ padding: '5px 10px' }}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={item.column_values.some(col => col.text === 'Done') || item.status === 'Completed'}
                      onChange={() => toggleDone(item)}
                      style={{ marginRight: '10px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: 'bold',
                        fontSize: '16px',
                        textDecoration: (item.column_values.some(col => col.text === 'Done') || item.status === 'Completed') ? 'line-through' : 'none',
                        color: (item.column_values.some(col => col.text === 'Done') || item.status === 'Completed') ? '#666' : '#000',
                        marginBottom: '4px'
                      }}>
                        {item.name}
                      </div>
                      {item.description && (
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                          {item.description}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: '#888' }}>
                        {item.priority && (
                          <span style={{ 
                            backgroundColor: item.priority === 'High' ? '#ffebee' : item.priority === 'Normal' ? '#f3e5f5' : '#e8f5e8',
                            color: item.priority === 'High' ? '#d32f2f' : item.priority === 'Normal' ? '#7b1fa2' : '#388e3c',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px'
                          }}>
                            {item.priority}
                          </span>
                        )}
                        {item.dueDate && (
                          <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                        )}
                        {item.owner && (
                          <span>Owner: {item.owner}</span>
                        )}
                        {item.status && (
                          <span>Status: {item.status}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => startEditing(item)} style={{ padding: '5px 10px', fontSize: '12px' }}>Edit</button>
                    <button onClick={() => deleteItem(item.id)} style={{ padding: '5px 10px', backgroundColor: '#ff4444', color: 'white', fontSize: '12px' }}>Delete</button>
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TodoList;