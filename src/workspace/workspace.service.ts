import { Injectable, Logger } from '@nestjs/common';
import { StorageService, StorageNamespace } from '../storage/storage.service';
import { nanoid } from 'nanoid';

export interface SavedScene {
  id: string;
  userId: string;
  name: string;
  encryptedData: Buffer;
  encryptionKey: string;
  created: number;
  modified: number;
  thumbnail?: string;
  elementCount?: number;
  fileCount?: number;
}

export interface SceneMetadata {
  id: string;
  name: string;
  created: number;
  modified: number;
  thumbnail?: string;
  elementCount?: number;
  fileCount?: number;
}

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);

  constructor(private readonly storageService: StorageService) {}

  private getSceneKey(userId: string, sceneId: string): string {
    return `workspace:${userId}:${sceneId}`;
  }

  private getUserMetaKey(userId: string): string {
    return `workspace:meta:${userId}`;
  }

  private validateUserId(userId: string): boolean {
    return /^[a-zA-Z0-9_-]{1,16}$/.test(userId);
  }

  private validateSceneId(sceneId: string): boolean {
    return /^[a-zA-Z0-9_-]{1,12}$/.test(sceneId);
  }

  private bufferToString(data: any): string | null {
    if (!data) return null;
    if (typeof data === 'string') return data;
    if (Buffer.isBuffer(data)) return data.toString('utf8');
    return String(data);
  }

  async saveScene(
    userId: string,
    sceneId: string,
    name: string,
    encryptedData: Buffer,
    encryptionKey: string,
  ): Promise<void> {
    if (!this.validateUserId(userId) || !this.validateSceneId(sceneId)) {
      throw new Error('Invalid user ID or scene ID');
    }

    const now = Date.now();
    const sceneKey = this.getSceneKey(userId, sceneId);
    const userMetaKey = this.getUserMetaKey(userId);

    // Check if scene already exists
    const existingSceneData = await this.storageService.get(sceneKey, StorageNamespace.SCENES);
    let existingCreated = now;
    
    if (existingSceneData) {
      try {
        const existingSceneStr = this.bufferToString(existingSceneData);
        if (existingSceneStr) {
          const existingScene = JSON.parse(existingSceneStr) as SavedScene;
          existingCreated = existingScene.created;
        }
      } catch (error) {
        this.logger.warn(`Failed to parse existing scene ${sceneId}`, error);
      }
    }

    // Save scene data
    const scene: SavedScene = {
      id: sceneId,
      userId: userId,
      name: name,
      encryptedData: encryptedData,
      encryptionKey: encryptionKey,
      created: existingCreated,
      modified: now,
    };

    await this.storageService.set(sceneKey, JSON.stringify(scene), StorageNamespace.SCENES);

    // Update user metadata
    const userMeta = await this.getUserScenes(userId);
    const updatedMeta = userMeta.filter(s => s.id !== sceneId);
    updatedMeta.push({
      id: sceneId,
      name: name,
      created: scene.created,
      modified: scene.modified,
    });

    // Keep only last 100 scenes
    updatedMeta.sort((a, b) => b.modified - a.modified);
    if (updatedMeta.length > 100) {
      updatedMeta.splice(100);
    }

    await this.storageService.set(userMetaKey, JSON.stringify(updatedMeta), StorageNamespace.SETTINGS);

    this.logger.log(`Saved scene ${sceneId} for user ${userId} (${existingSceneData ? 'updated' : 'created'})`);
  }

  async getUserScenes(userId: string): Promise<SceneMetadata[]> {
    if (!this.validateUserId(userId)) {
      throw new Error('Invalid user ID');
    }

    const userMetaKey = this.getUserMetaKey(userId);
    const metaData = await this.storageService.get(userMetaKey, StorageNamespace.SETTINGS);

    if (!metaData) {
      return [];
    }

    try {
      const metaStr = this.bufferToString(metaData);
      if (!metaStr) return [];
      
      const scenes = JSON.parse(metaStr) as SceneMetadata[];
      return scenes.sort((a, b) => b.modified - a.modified);
    } catch (error) {
      this.logger.error(`Failed to parse user metadata for ${userId}`, error);
      return [];
    }
  }

  async getScene(userId: string, sceneId: string): Promise<Buffer | null> {
    if (!this.validateUserId(userId) || !this.validateSceneId(sceneId)) {
      throw new Error('Invalid user ID or scene ID');
    }

    const sceneKey = this.getSceneKey(userId, sceneId);
    const sceneData = await this.storageService.get(sceneKey, StorageNamespace.SCENES);

    if (!sceneData) {
      return null;
    }

    try {
      const sceneStr = this.bufferToString(sceneData);
      if (!sceneStr) return null;
      
      const scene = JSON.parse(sceneStr) as SavedScene;
      return scene.encryptedData;
    } catch (error) {
      this.logger.error(`Failed to parse scene data for ${sceneId}`, error);
      return null;
    }
  }

  async deleteScene(userId: string, sceneId: string): Promise<boolean> {
    if (!this.validateUserId(userId) || !this.validateSceneId(sceneId)) {
      throw new Error('Invalid user ID or scene ID');
    }

    const sceneKey = this.getSceneKey(userId, sceneId);
    const userMetaKey = this.getUserMetaKey(userId);

    // Check if scene exists
    const exists = await this.storageService.has(sceneKey, StorageNamespace.SCENES);

    if (!exists) {
      return false;
    }

    // Delete scene data
    await this.storageService.set(sceneKey, null, StorageNamespace.SCENES);

    // Update user metadata
    const userMeta = await this.getUserScenes(userId);
    const updatedMeta = userMeta.filter(s => s.id !== sceneId);
    await this.storageService.set(userMetaKey, JSON.stringify(updatedMeta), StorageNamespace.SETTINGS);

    this.logger.log(`Deleted scene ${sceneId} for user ${userId}`);
    return true;
  }
}
