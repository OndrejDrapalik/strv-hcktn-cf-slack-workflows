import { SlackApp, SlackEdgeAppEnv, isPostedMessageEvent, ButtonAction, BlockAction, SectionBlock, DividerBlock } from "slack-cloudflare-workers";
import { 
  createFeedbackStep, 
  collectFeedbackData, 
  createReviewStep, 
  createFeedbackSummary 
} from "./handlers";
import { FeedbackMetadata } from "./types";

export default {
  async fetch(request: Request, env: SlackEdgeAppEnv, ctx: ExecutionContext): Promise<Response> {
    const app = new SlackApp({ env })
      // when the pattern matches, the framework automatically acknowledges the request
      .event("app_mention", async ({ context }) => {
        // You can do anything time-consuing tasks here!
        await context.client.chat.postMessage({
          channel: context.channelId,
          text: `:wave: <@${context.userId}> what's up?`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `:wave: <@${context.userId}> what's up?`,
              },
              accessory: {
                type: "button",
                text: { type: "plain_text", text: "Click Me" },
                value: "click_me_123",
                action_id: "button-action",
              },
            },
            {
              type: "context",
              elements: [
                {
                  type: "plain_text",
                  text: "This message is posted by an app running on Cloudflare Workers",
                },
              ],
            },
          ],
        });
      })
      .message("Hello", async ({ context }) => {
        await context.say({ text: "Hey!" });
      })
      .event("message", async ({ payload }) => {
        if (isPostedMessageEvent(payload)) {
          console.log(`New message: ${payload.text}`);
        }
      })
      .action(
        "button-action",
        async () => {}, // complete this within 3 seconds
        async ({ context }) => {
          // You can do anything time-consuing tasks here!
          const { respond } = context;
          if (respond) {
            await respond({ text: "Now working on it ..." });
            await sleep(5);
            await respond({ text: "It's done :white_check_mark:" });
          }
        },
      )
      .command(
        "/hello-cf-workers",
        async () => "Thanks!", // complete this within 3 seconds
        async ({ context }) => {
          // You can do anything time-consuing tasks here!
          await context.respond({ text: "What's up?" });
        },
      )
      .command(
        "/list-users",
        async () => "Fetching users...", // complete this within 3 seconds
        async ({ context }) => {
          try {
            // Fetch users from the Slack workspace
            const result = await context.client.users.list({
              limit: 200, // Adjust as needed
            });
            
            if (!result.ok || !result.members) {
              await context.respond({ text: "Failed to fetch users." });
              return;
            }
            
            // Filter out bots and deleted users
            const activeUsers = result.members.filter(
              (user) => !user.is_bot && !user.deleted && user.id !== "USLACKBOT"
            );
            
            // Create blocks for the response
            const blocks: (SectionBlock | DividerBlock)[] = [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*Active Users in Workspace* (${activeUsers.length} total)`,
                },
              },
              {
                type: "divider",
              },
            ];
            
            // Add user information
            const userList = activeUsers
              .map((user) => {
                const name = user.real_name || user.name || "Unknown";
                const email = user.profile?.email || "No email";
                const title = user.profile?.title || "No title";
                return `• *${name}* (<@${user.id}>)\n  _${title}_ | ${email}`;
              })
              .join("\n\n");
            
            blocks.push({
              type: "section",
              text: {
                type: "mrkdwn",
                text: userList || "No active users found.",
              },
            });
            
            await context.respond({
              text: `Found ${activeUsers.length} active users`,
              blocks,
            });
          } catch (error) {
            console.error("Error fetching users:", error);
            await context.respond({
              text: "An error occurred while fetching users. Please try again later.",
            });
          }
        },
      )
      .shortcut(
        "hey-cf-workers",
        async () => {}, // complete this within 3 seconds
        async ({ context, payload }) => {
          // You can do anything time-consuing tasks here!
          await context.client.views.open({
            // trigger_id still needs to be used within 3 seconds
            trigger_id: payload.trigger_id,
            view: {
              type: "modal",
              callback_id: "modal",
              title: { type: "plain_text", text: "My App" },
              submit: { type: "plain_text", text: "Submit" },
              close: { type: "plain_text", text: "Cancel" },
              blocks: [],
            },
          });
        },
      )
      .messageShortcut(
        "cf-workers-message",
        async () => {}, // complete this within 3 seconds
        async ({ context, payload }) => {
          // You can do anything time-consuing tasks here!
          await context.client.views.open({
            // trigger_id still needs to be used within 3 seconds
            trigger_id: payload.trigger_id,
            view: {
              type: "modal",
              callback_id: "modal",
              title: { type: "plain_text", text: "My App" },
              submit: { type: "plain_text", text: "Submit" },
              close: { type: "plain_text", text: "Cancel" },
              blocks: [],
            },
          });
        },
      )
      .viewSubmission(
        "modal",
        // respond within 3 seconds to update/close the opening modal
        async () => {
          return { response_action: "clear" };
        },
        async (req) => {
          // Except updating the modal view using response_action,
          // you can asynchronously do any tasks here!
        },
      )
      // Feedback command
      .command(
        "/peer-feedback",
        async () => "", // acknowledge immediately
        async ({ context, payload }) => {
          // Open the initial user selection modal
          await context.client.views.open({
            trigger_id: payload.trigger_id,
            view: {
              type: "modal",
              callback_id: "feedback_user_select",
              title: { type: "plain_text", text: "Give Feedback" },
              submit: { type: "plain_text", text: "Next" },
              close: { type: "plain_text", text: "Cancel" },
              blocks: [
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: "Select a team member to give feedback to:"
                  }
                },
                {
                  type: "input",
                  block_id: "user_select",
                  element: {
                    type: "users_select",
                    placeholder: {
                      type: "plain_text",
                      text: "Select a user"
                    },
                    action_id: "selected_user"
                  },
                  label: {
                    type: "plain_text",
                    text: "Team Member"
                  }
                }
              ],
              private_metadata: JSON.stringify({
                channel_id: payload.channel_id,
                user_id: payload.user_id,
                step: 1
              })
            }
          });
        },
      )
      // Feedback modal handlers
      .viewSubmission(
        "feedback_user_select",
        async ({ payload }) => {
          const metadata = JSON.parse(payload.view.private_metadata) as FeedbackMetadata;
          const selectedUser = payload.view.state.values.user_select.selected_user.selected_user;
          metadata.selected_user = selectedUser;
          metadata.step = 2;
          
          return {
            response_action: "update" as const,
            view: createFeedbackStep(2, metadata)
          };
        },
        async () => {}
      )
      .viewSubmission(
        "feedback_back_to_user_select",
        async ({ payload }) => {
          const metadata = JSON.parse(payload.view.private_metadata) as FeedbackMetadata;
          // Go back to user selection
          return {
            response_action: "update" as const,
            view: {
              type: "modal" as const,
              callback_id: "feedback_user_select",
              title: { type: "plain_text" as const, text: "Give Feedback" },
              submit: { type: "plain_text" as const, text: "Next" },
              close: { type: "plain_text" as const, text: "Cancel" },
              blocks: [
                {
                  type: "section" as const,
                  text: {
                    type: "mrkdwn" as const,
                    text: "Select a team member to give feedback to:"
                  }
                },
                {
                  type: "input" as const,
                  block_id: "user_select",
                  element: {
                    type: "users_select" as const,
                    placeholder: {
                      type: "plain_text" as const,
                      text: "Select a user"
                    },
                    action_id: "selected_user",
                    initial_user: metadata.selected_user
                  },
                  label: {
                    type: "plain_text" as const,
                    text: "Team Member"
                  }
                }
              ],
              private_metadata: JSON.stringify(metadata)
            }
          };
        },
        async () => {}
      )
      .viewSubmission(
        /^feedback_step_\d+$/,
        async ({ payload }) => {
          const metadata = JSON.parse(payload.view.private_metadata) as FeedbackMetadata;
          const stepNum = parseInt(payload.view.callback_id.split("_")[2]);
          
          // Collect data from current step
          collectFeedbackData(stepNum, payload.view.state.values, metadata);
          
          if (stepNum < 5) {
            // Move to next step
            metadata.step = stepNum + 1;
            return {
              response_action: "update" as const,
              view: createFeedbackStep(stepNum + 1, metadata)
            };
          } else {
            // Final step - show review
            return {
              response_action: "update" as const,
              view: createReviewStep(metadata)
            };
          }
        },
        async () => {}
      )
      .viewSubmission(
        "feedback_review",
        async () => ({ response_action: "clear" as const }),
        async ({ context, payload }) => {
          const metadata = JSON.parse(payload.view.private_metadata) as FeedbackMetadata;
          const feedbackSummary = createFeedbackSummary(metadata);
          
          await context.client.chat.postMessage({
            channel: metadata.channel_id,
            text: feedbackSummary.text,
            blocks: feedbackSummary.blocks
          });
        }
      )
      // Back button handlers
      .action(
        /^back_to_\d+$/,
        async () => {}, // acknowledge
        async ({ context, payload }) => {
          const action = payload.actions[0] as ButtonAction;
          if (action.action_id.startsWith("back_to_") && 'view' in payload) {
            const blockAction = payload as BlockAction<ButtonAction> & { view: { id: string; private_metadata: string } };
            const targetStep = parseInt(action.value);
            const metadata = JSON.parse(blockAction.view.private_metadata) as FeedbackMetadata;
            
            await context.client.views.update({
              view_id: blockAction.view.id,
              view: createFeedbackStep(targetStep, metadata)
            });
          }
        }
      )
      .action(
        "back_to_user_select",
        async () => {}, // acknowledge
        async ({ context, payload }) => {
          if ('view' in payload) {
            const blockAction = payload as BlockAction<ButtonAction> & { view: { id: string; private_metadata: string } };
            const metadata = JSON.parse(blockAction.view.private_metadata) as FeedbackMetadata;
            
            await context.client.views.update({
              view_id: blockAction.view.id,
              view: {
                type: "modal" as const,
                callback_id: "feedback_user_select",
                title: { type: "plain_text" as const, text: "Give Feedback" },
                submit: { type: "plain_text" as const, text: "Next" },
                close: { type: "plain_text" as const, text: "Cancel" },
                blocks: [
                  {
                    type: "section" as const,
                    text: {
                      type: "mrkdwn" as const,
                      text: "Select a team member to give feedback to:"
                    }
                  },
                  {
                    type: "input" as const,
                    block_id: "user_select",
                    element: {
                      type: "users_select" as const,
                      placeholder: {
                        type: "plain_text" as const,
                        text: "Select a user"
                      },
                      action_id: "selected_user",
                      initial_user: metadata.selected_user
                    },
                    label: {
                      type: "plain_text" as const,
                      text: "Team Member"
                    }
                  }
                ],
                private_metadata: JSON.stringify(metadata)
              }
            });
          }
        }
      );
    return await app.run(request, ctx);
  },
};

const sleep = (seconds: number) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};
