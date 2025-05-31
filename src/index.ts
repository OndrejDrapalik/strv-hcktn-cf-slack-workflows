import { SlackApp, SlackEdgeAppEnv, isPostedMessageEvent, AnyMessageBlock } from "slack-cloudflare-workers";

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
            const blocks: AnyMessageBlock[] = [
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
      );
    return await app.run(request, ctx);
  },
};

const sleep = (seconds: number) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};
