import { Module } from '@nestjs/common';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { StorageService } from '../storage/storage.service';

@Module({
  controllers: [WorkspaceController],
  providers: [WorkspaceService, StorageService],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
