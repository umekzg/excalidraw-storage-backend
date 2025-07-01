import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Headers,
  Res,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { WorkspaceService } from './workspace.service';

@Controller('workspace')
export class WorkspaceController {
  private readonly logger = new Logger(WorkspaceController.name);

  constructor(private readonly workspaceService: WorkspaceService) {}

  @Put(':workspaceId/:sceneId')
  async saveScene(
    @Param('workspaceId') userId: string,
    @Param('sceneId') sceneId: string,
    @Body() encryptedData: Buffer,
    @Headers('x-scene-name') sceneName: string = 'Untitled',
    @Headers('x-encryption-key') encryptionKey: string,
  ) {
    try {
      if (!encryptionKey) {
        throw new HttpException('Missing encryption key', HttpStatus.BAD_REQUEST);
      }

      const decodedName = decodeURIComponent(sceneName);

      await this.workspaceService.saveScene(
        userId,
        sceneId,
        decodedName,
        encryptedData,
        encryptionKey,
      );

      return {
        success: true,
        sceneId: sceneId,
        message: 'Scene saved successfully',
      };
    } catch (error) {
      this.logger.error(`Error saving scene ${sceneId} for user ${userId}`, error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to save scene', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':workspaceId')
  async getUserScenes(@Param('workspaceId') userId: string) {
    try {
      const scenes = await this.workspaceService.getUserScenes(userId);
      return scenes;
    } catch (error) {
      this.logger.error(`Error getting scenes for user ${userId}`, error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to get scenes', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':workspaceId/:sceneId')
  async getScene(
    @Param('workspaceId') userId: string,
    @Param('sceneId') sceneId: string,
    @Res() res: Response,
  ) {
    try {
      const sceneData = await this.workspaceService.getScene(userId, sceneId);

      if (!sceneData) {
        throw new HttpException('Scene not found', HttpStatus.NOT_FOUND);
      }

      res.set('Content-Type', 'application/octet-stream');
      res.send(sceneData);
    } catch (error) {
      this.logger.error(`Error getting scene ${sceneId} for user ${userId}`, error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to get scene', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':workspaceId/:sceneId')
  async deleteScene(
    @Param('workspaceId') userId: string,
    @Param('sceneId') sceneId: string,
  ) {
    try {
      const deleted = await this.workspaceService.deleteScene(userId, sceneId);

      if (!deleted) {
        throw new HttpException('Scene not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        message: 'Scene deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Error deleting scene ${sceneId} for user ${userId}`, error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to delete scene', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
