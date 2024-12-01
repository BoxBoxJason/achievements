import * as vscode from 'vscode';
import type { GitExtension, Repository } from '../../types/git';
import logger from '../utils/logger';
import { ProgressionController } from '../database/controller/progressions';
import { constants } from '../constants';

export namespace gitListeners {

  export function createGitListeners(context: vscode.ExtensionContext) {
    const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports as GitExtension;
    if (!gitExtension) {
      logger.error('Git extension not found, git listeners will not be created');
      return;
    }

    const gitAPI = gitExtension.getAPI(1);

    // Handle current workspace repositories commits
    gitAPI.repositories.forEach((repository: Repository) => {
      repository.onDidCommit(() => {
        ProgressionController.increaseProgression(constants.criteria.COMMITS);
      }, null, context.subscriptions);
    });

    // Handle new repositories commits
    gitAPI.onDidOpenRepository((repository: Repository) => {
      repository.onDidCommit(() => {
        ProgressionController.increaseProgression(constants.criteria.COMMITS);
      }, null, context.subscriptions);
    }, null, context.subscriptions);

    // Handle push event
    gitAPI.onDidPublish(() => {
      ProgressionController.increaseProgression(constants.criteria.PUSHES);
    }, null, context.subscriptions);
  }

}
