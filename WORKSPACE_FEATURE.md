# Workspace Feature

This feature adds personal workspace functionality to the Excalidraw storage backend, allowing users to save, load, and manage their drawings in a personal workspace.

## Features

- **Personal Storage**: Each user has their own private workspace
- **Client-Side Encryption**: All scene data is encrypted before transmission
- **Scene Management**: Save, load, list, and delete saved scenes
- **Metadata Tracking**: Scene names, creation/modification dates
- **No Authentication**: Uses client-generated user IDs

## API Endpoints

### 1. Save Scene to Workspace
```
PUT /api/v2/workspace/{userId}/{sceneId}
```

**Headers:**
- `Content-Type: application/octet-stream`
- `X-Scene-Name: {encodedSceneName}`
- `X-Encryption-Key: {encryptionKey}`

**Body:** Binary encrypted scene data (IV + ciphertext)

**Response:**
```json
{
  "success": true,
  "sceneId": "abc123def456",
  "message": "Scene saved successfully"
}
```

### 2. List User's Saved Scenes
```
GET /api/v2/workspace/{userId}
```

**Response:**
```json
[
  {
    "id": "abc123def456",
    "name": "My Drawing",
    "created": 1672531200000,
    "modified": 1672531200000,
    "thumbnail": "data:image/png;base64,...",
    "elementCount": 15,
    "fileCount": 2
  }
]
```

### 3. Load Scene from Workspace
```
GET /api/v2/workspace/{userId}/{sceneId}
```

**Response:** Binary encrypted scene data

### 4. Delete Scene from Workspace
```
DELETE /api/v2/workspace/{userId}/{sceneId}
```

**Response:**
```json
{
  "success": true,
  "message": "Scene deleted successfully"
}
```

## Security

- **Client-Side Encryption**: All scene data is encrypted before transmission
- **Unique Encryption Keys**: Each scene has its own encryption key
- **Input Validation**: User IDs and scene IDs are validated
- **No Authentication**: Uses client-generated user IDs for simplicity

## Storage

- Uses existing Keyv storage with PostgreSQL backend
- Scene data stored in `SCENES` namespace
- User metadata stored in `SETTINGS` namespace
- Automatic cleanup of old scenes (max 100 per user)

## Usage Example

```javascript
// Save a scene
const response = await fetch(`${WORKSPACE_URL}/workspace/${userId}/${sceneId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/octet-stream',
    'X-Scene-Name': encodeURIComponent(sceneName),
    'X-Encryption-Key': encryptionKey,
  },
  body: encryptedData,
});

// Load scenes list
const scenes = await fetch(`${WORKSPACE_URL}/workspace/${userId}`).then(r => r.json());

// Load specific scene
const sceneData = await fetch(`${WORKSPACE_URL}/workspace/${userId}/${sceneId}`).then(r => r.arrayBuffer());
```

## Integration

This feature integrates seamlessly with the existing Excalidraw storage backend:

- Uses existing `StorageService` for data persistence
- Follows existing architecture patterns (NestJS, controllers/services)
- No additional dependencies required
- Graceful failure if feature is unavailable

## Deployment

1. Merge the `feature/workspace` branch
2. Deploy the updated backend
3. The workspace endpoints will be available at `/api/v2/workspace`
4. The frontend Draw application will automatically detect and use the feature

## Monitoring

- Check logs for workspace operations
- Monitor storage usage growth
- Verify API endpoint response times
- Check for errors in encryption/decryption operations
