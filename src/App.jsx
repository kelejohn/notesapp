// src/App.jsx
import React, { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import outputs from './amplify_outputs.json';
import {
  Authenticator,
  View,
  Image,
  Text,
  TextField,
  Button,
  Flex,
  Heading
} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { generateClient } from 'aws-amplify/data';
import { uploadData, getUrl } from 'aws-amplify/storage';

// Configure Amplify with generated outputs
Amplify.configure(outputs);

// Create a GraphQL client
const client = generateClient();

function App() {
  const [notes, setNotes] = useState([]);
  const [formData, setFormData] = useState({ name: '', description: '', image: null });

  // Fetch notes from backend
  async function fetchNotes() {
    try {
      const noteData = await client.models.Note.list();
      const notesWithImages = await Promise.all(
        noteData.data.map(async (note) => {
          if (note.image) {
            const url = await getUrl({ key: note.image });
            note.imageUrl = url.url;
          }
          return note;
        })
      );
      setNotes(notesWithImages);
    } catch (err) {
      console.error('Error fetching notes:', err);
    }
  }

  // Create a new note
  async function createNote() {
    if (!formData.name || !formData.description) return;

    let imageKey;
    if (formData.image) {
      imageKey = `${Date.now()}-${formData.image.name}`;
      await uploadData({
        key: imageKey,
        data: formData.image,
      }).result;
    }

    try {
      await client.models.Note.create({
        name: formData.name,
        description: formData.description,
        image: imageKey,
      });
      setFormData({ name: '', description: '', image: null });
      fetchNotes();
    } catch (err) {
      console.error('Error creating note:', err);
    }
  }

  // Delete a note
  async function deleteNote(id) {
    try {
      await client.models.Note.delete({ id });
      fetchNotes();
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  }

  useEffect(() => {
    fetchNotes();
  }, []);

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <View className="App" padding="1rem">
          <Flex justifyContent="space-between" alignItems="center" marginBottom="1rem">
            <Heading level={3}>Hello, {user.username}</Heading>
            <Button onClick={signOut}>Sign out</Button>
          </Flex>

          <Flex direction="column" gap="0.5rem" marginBottom="1rem">
            <TextField
              placeholder="Note name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              placeholder="Note description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <input
              type="file"
              onChange={(e) => setFormData({ ...formData, image: e.target.files[0] })}
            />
            <Button onClick={createNote}>Create Note</Button>
          </Flex>

          <View>
            {notes.map((note) => (
              <Flex
                key={note.id}
                direction="column"
                border="1px solid #ddd"
                borderRadius="8px"
                padding="1rem"
                marginBottom="1rem"
              >
                <Text fontWeight="bold">{note.name}</Text>
                <Text>{note.description}</Text>
                {note.imageUrl && (
                  <Image src={note.imageUrl} alt={note.name} width="200px" />
                )}
                <Button
                  variation="destructive"
                  onClick={() => deleteNote(note.id)}
                  marginTop="0.5rem"
                >
                  Delete note
                </Button>
              </Flex>
            ))}
          </View>
        </View>
      )}
    </Authenticator>
  );
}

export default App;
