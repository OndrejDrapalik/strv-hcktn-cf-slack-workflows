// If you want to use this code instead of index.ts, edit ./wrangler.toml

import { SlackApp, SlackEdgeAppEnv } from "slack-cloudflare-workers";
import {
  ackCommand,
  ackListUsersCommand,
  ackModalSubmission,
  appMention,
  asyncButtonResponse,
  asyncCommandResponse,
  asyncListUsersResponse,
  asyncMessageShortcut,
  asyncModalResponse,
  asyncShortcutResponse,
  helloMessage, 
  otherMessages,
  ackFeedbackCommand,
  asyncFeedbackResponse,
  ackFeedbackModalSubmission,
  asyncFeedbackModalResponse,
  feedbackBackButtonHandler,
} from "./handlers";

export default {
  async fetch(request: Request, env: SlackEdgeAppEnv, ctx: ExecutionContext): Promise<Response> {
    const app = new SlackApp({ env })
      // when the pattern matches, the framework automatically acknowledges the request
      .event("app_mention", appMention)
      .message("Hello", helloMessage)
      .event("message", otherMessages)
      .action(
        "button-action",
        noopAckHandler, // complete this within 3 seconds
        asyncButtonResponse,
      )
      .command(
        "/hello-cf-workers",
        ackCommand, // complete this within 3 seconds
        asyncCommandResponse,
      )
      .command(
        "/list-users",
        ackListUsersCommand, // complete this within 3 seconds
        asyncListUsersResponse,
      )
      .shortcut(
        "hey-cf-workers",
        noopAckHandler, // complete this within 3 seconds
        asyncShortcutResponse,
      )
      .messageShortcut(
        "cf-workers-message",
        noopAckHandler, // complete this within 3 seconds
        asyncMessageShortcut,
      )
      .viewSubmission(
        "modal",
        // respond within 3 seconds to update/close the opening modal
        ackModalSubmission,
        asyncModalResponse,
      )
      .command(
        "/peer-feedback",
        ackFeedbackCommand,
        asyncFeedbackResponse,
      )
      .viewSubmission(
        "feedback_user_select",
        ackFeedbackModalSubmission,
        asyncFeedbackModalResponse,
      )
      .viewSubmission(
        /^feedback_step_\d+$/,
        ackFeedbackModalSubmission,
        asyncFeedbackModalResponse,
      )
      .viewSubmission(
        "feedback_review",
        ackFeedbackModalSubmission,
        asyncFeedbackModalResponse,
      )
      .action(
        /^back_to_\d+$/,
        noopAckHandler,
        feedbackBackButtonHandler,
      );
    return await app.run(request, ctx);
  },
};

const noopAckHandler = async () => {};
