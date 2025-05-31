import {
  BlockActionLazyHandler,
  EventLazyHandler,
  MessageEventLazyHandler,
  MessageShortcutLazyHandler,
  ShortcutLazyHandler,
  SlashCommandAckHandler,
  SlashCommandLazyHandler,
  ViewSubmissionAckHandler,
  ViewSubmissionLazyHandler,
  isPostedMessageEvent,
} from "slack-cloudflare-workers";

export const appMention: EventLazyHandler<"app_mention"> = async ({ context }) => {
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
};

export const helloMessage: MessageEventLazyHandler = async ({ context }) => {
  await context.say({ text: "Hey!" });
};

export const otherMessages: EventLazyHandler<"message"> = async ({ payload }) => {
  if (isPostedMessageEvent(payload)) {
    console.log(`New message: ${payload.text}`);
  }
};

export const asyncButtonResponse: BlockActionLazyHandler<"button"> = async ({ context }) => {
  // You can do anything time-consuing tasks here!
  const { respond } = context;
  const sleep = (seconds: number) => {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  };
  if (respond) {
    await respond({ text: "Now working on it ..." });
    await sleep(5);
    await respond({ text: "It's done :white_check_mark:" });
  }
};

export const ackCommand: SlashCommandAckHandler = async () => "Thanks!";
export const asyncCommandResponse: SlashCommandLazyHandler = async ({ context }) => {
  // You can do anything time-consuing tasks here!
  await context.respond({ text: "What's up?" });
};

export const ackListUsersCommand: SlashCommandAckHandler = async () => "Fetching users...";
export const asyncListUsersResponse: SlashCommandLazyHandler = async ({ context }) => {
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
    const blocks = [
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
};

export const asyncShortcutResponse: ShortcutLazyHandler = async ({ context, payload }) => {
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
};

export const asyncMessageShortcut: MessageShortcutLazyHandler = async ({ context, payload }) => {
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
};

export const ackModalSubmission: ViewSubmissionAckHandler = async () => {
  return { response_action: "clear" };
};
export const asyncModalResponse: ViewSubmissionLazyHandler = async (req) => {
  // Except updating the modal view using response_action,
  // you can asynchronously do any tasks here!
};
