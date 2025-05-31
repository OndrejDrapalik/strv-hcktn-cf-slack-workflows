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
  BlockAction,
  ButtonAction,
  SectionBlock,
  DividerBlock,
} from "slack-cloudflare-workers";
import {
  FeedbackMetadata,
  FeedbackSummaryResponse,
  FeedbackModalBlock,
  FeedbackModalView,
  PERFORMANCE_RATINGS,
  COLLABORATION_RATINGS,
  SKILLS_RATINGS,
  RATING_LABELS,
  RATING_LABELS_DETAILED,
} from "./types";

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

// Feedback back button handler
export const feedbackBackButtonHandler: BlockActionLazyHandler<"button"> = async ({ context, payload }) => {
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
    const blocks: (SectionBlock | DividerBlock)[] = [
      {
        type: "section" as const,
        text: {
          type: "mrkdwn" as const,
          text: `*Active Users in Workspace* (${activeUsers.length} total)`,
        },
      },
      {
        type: "divider" as const,
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
      type: "section" as const,
      text: {
        type: "mrkdwn" as const,
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

// Feedback command handlers
export const ackFeedbackCommand: SlashCommandAckHandler = async () => "";
export const asyncFeedbackResponse: SlashCommandLazyHandler = async ({ context, payload }) => {
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
};

// Feedback modal navigation handlers
export const ackFeedbackModalSubmission: ViewSubmissionAckHandler = async ({ payload }) => {
  const metadata = JSON.parse(payload.view.private_metadata) as FeedbackMetadata;
  const currentStep = metadata.step || 1;
  
  if (payload.view.callback_id === "feedback_user_select") {
    // User selection step - move to step 1 of feedback
    const selectedUser = payload.view.state.values.user_select.selected_user.selected_user;
    metadata.selected_user = selectedUser;
    metadata.step = 2;
    
    return {
      response_action: "update" as const,
      view: createFeedbackStep(2, metadata)
    };
  } else if (payload.view.callback_id.startsWith("feedback_step_")) {
    const stepNum = parseInt(payload.view.callback_id.split("_")[2]);
    
    // Collect data from current step
    collectFeedbackData(stepNum, payload.view.state.values, metadata);
    
    if (stepNum < 4) {
      // Move to next step
      metadata.step = stepNum + 1;
      return {
        response_action: "update" as const,
        view: createFeedbackStep(stepNum + 1, metadata)
      };
    } else {
      // Final step - show review
      metadata.step = 5;
      return {
        response_action: "update" as const,
        view: createReviewStep(metadata)
      };
    }
  } else if (payload.view.callback_id === "feedback_review") {
    // Final submission
    return { response_action: "clear" as const };
  } else if (payload.view.callback_id.startsWith("feedback_back_")) {
    // Handle back navigation
    const targetStep = parseInt(payload.view.callback_id.split("_")[2]);
    metadata.step = targetStep;
    return {
      response_action: "update" as const,
      view: createFeedbackStep(targetStep, metadata)
    };
  }
  
  return { response_action: "clear" as const };
};

export const asyncFeedbackModalResponse: ViewSubmissionLazyHandler = async ({ context, payload }) => {
  if (payload.view.callback_id === "feedback_review") {
    const metadata = JSON.parse(payload.view.private_metadata) as FeedbackMetadata;
    
    // Post feedback summary to the channel
    const feedbackSummary = createFeedbackSummary(metadata);
    
    await context.client.chat.postMessage({
      channel: metadata.channel_id,
      text: feedbackSummary.text,
      blocks: feedbackSummary.blocks
    });
  }
};

// Helper functions for feedback workflow
export function createFeedbackStep(step: number, metadata: FeedbackMetadata): FeedbackModalView {
  const steps: { title: string; blocks: FeedbackModalBlock[] }[] = [
    {
      title: "Performance",
      blocks: [
        {
          type: "section" as const,
          text: {
            type: "mrkdwn" as const,
            text: `*Feedback for <@${metadata.selected_user}>*\n\nStep 1 of 4: Performance Evaluation`
          }
        },
        {
          type: "divider" as const
        },
        {
          type: "input" as const,
          block_id: "performance_rating",
          element: {
            type: "static_select" as const,
            placeholder: { type: "plain_text" as const, text: "Select rating" },
            action_id: "rating",
            options: PERFORMANCE_RATINGS
          },
          label: { type: "plain_text" as const, text: "Overall Performance" }
        },
        {
          type: "input" as const,
          block_id: "performance_comments",
          element: {
            type: "plain_text_input" as const,
            multiline: true,
            action_id: "comments",
            placeholder: { type: "plain_text" as const, text: "Share specific examples..." }
          },
          label: { type: "plain_text" as const, text: "Comments" },
          optional: true
        },
        {
          type: "actions" as const,
          elements: [
            {
              type: "button" as const,
              text: { type: "plain_text" as const, text: "← Change User" },
              action_id: "back_to_user_select",
              value: "user_select"
            }
          ]
        }
      ]
    },
    {
      title: "Collaboration",
      blocks: [
        {
          type: "section" as const,
          text: {
            type: "mrkdwn" as const,
            text: `*Feedback for <@${metadata.selected_user}>*\n\nStep 2 of 4: Collaboration & Teamwork`
          }
        },
        {
          type: "divider" as const
        },
        {
          type: "input" as const,
          block_id: "collaboration_rating",
          element: {
            type: "static_select" as const,
            placeholder: { type: "plain_text" as const, text: "Select rating" },
            action_id: "rating",
            options: COLLABORATION_RATINGS
          },
          label: { type: "plain_text" as const, text: "Collaboration Rating" }
        },
        {
          type: "input" as const,
          block_id: "collaboration_comments",
          element: {
            type: "plain_text_input" as const,
            multiline: true,
            action_id: "comments",
            placeholder: { type: "plain_text" as const, text: "How well do they work with others?" }
          },
          label: { type: "plain_text" as const, text: "Comments" },
          optional: true
        },
        {
          type: "actions" as const,
          elements: [
            {
              type: "button" as const,
              text: { type: "plain_text" as const, text: "← Back" },
              action_id: "back_to_1",
              value: "1"
            }
          ]
        }
      ]
    },
    {
      title: "Skills & Growth",
      blocks: [
        {
          type: "section" as const,
          text: {
            type: "mrkdwn" as const,
            text: `*Feedback for <@${metadata.selected_user}>*\n\nStep 3 of 4: Skills & Growth`
          }
        },
        {
          type: "divider" as const
        },
        {
          type: "input" as const,
          block_id: "skills_rating",
          element: {
            type: "static_select" as const,
            placeholder: { type: "plain_text" as const, text: "Select rating" },
            action_id: "rating",
            options: SKILLS_RATINGS
          },
          label: { type: "plain_text" as const, text: "Technical/Professional Skills" }
        },
        {
          type: "input" as const,
          block_id: "growth_areas",
          element: {
            type: "plain_text_input" as const,
            multiline: true,
            action_id: "areas",
            placeholder: { type: "plain_text" as const, text: "What skills should they develop?" }
          },
          label: { type: "plain_text" as const, text: "Growth Areas" },
          optional: true
        },
        {
          type: "actions" as const,
          elements: [
            {
              type: "button" as const,
              text: { type: "plain_text" as const, text: "← Back" },
              action_id: "back_to_2",
              value: "2"
            }
          ]
        }
      ]
    },
    {
      title: "Overall Feedback",
      blocks: [
        {
          type: "section" as const,
          text: {
            type: "mrkdwn" as const,
            text: `*Feedback for <@${metadata.selected_user}>*\n\nStep 4 of 4: Overall Feedback`
          }
        },
        {
          type: "divider" as const
        },
        {
          type: "input" as const,
          block_id: "strengths",
          element: {
            type: "plain_text_input" as const,
            multiline: true,
            action_id: "text",
            placeholder: { type: "plain_text" as const, text: "What are their key strengths?" }
          },
          label: { type: "plain_text" as const, text: "Key Strengths" }
        },
        {
          type: "input" as const,
          block_id: "improvements",
          element: {
            type: "plain_text_input" as const,
            multiline: true,
            action_id: "text",
            placeholder: { type: "plain_text" as const, text: "What could they improve?" }
          },
          label: { type: "plain_text" as const, text: "Areas for Improvement" }
        },
        {
          type: "input" as const,
          block_id: "additional",
          element: {
            type: "plain_text_input" as const,
            multiline: true,
            action_id: "text",
            placeholder: { type: "plain_text" as const, text: "Any other feedback?" }
          },
          label: { type: "plain_text" as const, text: "Additional Comments" },
          optional: true
        },
        {
          type: "actions" as const,
          elements: [
            {
              type: "button" as const,
              text: { type: "plain_text" as const, text: "← Back" },
              action_id: "back_to_3",
              value: "3"
            }
          ]
        }
      ]
    }
  ];
  
  const stepData = steps[step - 2];
  
  return {
    type: "modal" as const,
    callback_id: `feedback_step_${step}`,
    title: { type: "plain_text" as const, text: stepData.title },
    submit: { type: "plain_text" as const, text: step < 5 ? "Next" : "Review" },
    close: { type: "plain_text" as const, text: "Cancel" },
    blocks: stepData.blocks,
    private_metadata: JSON.stringify(metadata)
  };
}

export function collectFeedbackData(step: number, values: Record<string, any>, metadata: FeedbackMetadata): void {
  switch (step) {
    case 2:
      metadata.performance = {
        rating: values.performance_rating.rating.selected_option.value,
        comments: values.performance_comments?.comments?.value || ""
      };
      break;
    case 3:
      metadata.collaboration = {
        rating: values.collaboration_rating.rating.selected_option.value,
        comments: values.collaboration_comments?.comments?.value || ""
      };
      break;
    case 4:
      metadata.skills = {
        rating: values.skills_rating.rating.selected_option.value,
        growth_areas: values.growth_areas?.areas?.value || ""
      };
      break;
    case 5:
      metadata.overall = {
        strengths: values.strengths.text.value,
        improvements: values.improvements.text.value,
        additional: values.additional?.text?.value || ""
      };
      break;
  }
}

export function createReviewStep(metadata: FeedbackMetadata): FeedbackModalView {
  const blocks: FeedbackModalBlock[] = [
      {
        type: "section" as const,
        text: {
          type: "mrkdwn" as const,
          text: `*Review your feedback for <@${metadata.selected_user}>*`
        }
      },
      {
        type: "divider" as const
      },
      {
        type: "section" as const,
        fields: [
          {
            type: "mrkdwn" as const,
            text: `*Performance:* ${RATING_LABELS[metadata.performance?.rating || "3"]}\n${metadata.performance?.comments || "_No comments_"}`
          },
          {
            type: "mrkdwn" as const,
            text: `*Collaboration:* ${RATING_LABELS[metadata.collaboration?.rating || "3"]}\n${metadata.collaboration?.comments || "_No comments_"}`
          },
          {
            type: "mrkdwn" as const,
            text: `*Skills:* ${RATING_LABELS[metadata.skills?.rating || "3"]}\n${metadata.skills?.growth_areas || "_No growth areas specified_"}`
          }
        ]
      },
      {
        type: "section" as const,
        text: {
          type: "mrkdwn" as const,
          text: `*Strengths:*\n${metadata.overall?.strengths || "_Not provided_"}\n\n*Areas for Improvement:*\n${metadata.overall?.improvements || "_Not provided_"}${metadata.overall?.additional ? `\n\n*Additional Comments:*\n${metadata.overall.additional}` : ""}`
        }
      },
      {
        type: "context" as const,
        elements: [
          {
            type: "mrkdwn" as const,
            text: "This feedback will be posted to the channel where you initiated the command."
          }
        ]
      },
      {
        type: "actions" as const,
        elements: [
          {
            type: "button" as const,
            text: { type: "plain_text" as const, text: "← Edit Feedback" },
            action_id: "back_to_4",
            value: "4"
          }
        ]
      }
    ];
  
  return {
    type: "modal" as const,
    callback_id: "feedback_review",
    title: { type: "plain_text" as const, text: "Review Feedback" },
    submit: { type: "plain_text" as const, text: "Submit Feedback" },
    close: { type: "plain_text" as const, text: "Cancel" },
    blocks,
    private_metadata: JSON.stringify(metadata)
  };
}

export function createFeedbackSummary(metadata: FeedbackMetadata): FeedbackSummaryResponse {
  const blocks = [
    {
      type: "header" as const,
      text: {
        type: "plain_text" as const,
        text: "📝 Peer Feedback Submitted"
      }
    },
    {
      type: "section" as const,
      text: {
        type: "mrkdwn" as const,
        text: `<@${metadata.user_id}> has submitted feedback for <@${metadata.selected_user}>`
      }
    },
    {
      type: "divider" as const
    },
    {
      type: "section" as const,
      text: {
        type: "mrkdwn" as const,
        text: "*Performance Rating*"
      },
      fields: [
        {
          type: "mrkdwn" as const,
          text: RATING_LABELS_DETAILED[metadata.performance?.rating || "3"]
        },
        {
          type: "mrkdwn" as const,
          text: metadata.performance?.comments || "_No specific comments_"
        }
      ]
    },
    {
      type: "section" as const,
      text: {
        type: "mrkdwn" as const,
        text: "*Collaboration & Teamwork*"
      },
      fields: [
        {
          type: "mrkdwn" as const,
          text: RATING_LABELS_DETAILED[metadata.collaboration?.rating || "3"]
        },
        {
          type: "mrkdwn" as const,
          text: metadata.collaboration?.comments || "_No specific comments_"
        }
      ]
    },
    {
      type: "section" as const,
      text: {
        type: "mrkdwn" as const,
        text: "*Skills & Growth*"
      },
      fields: [
        {
          type: "mrkdwn" as const,
          text: RATING_LABELS_DETAILED[metadata.skills?.rating || "3"]
        },
        {
          type: "mrkdwn" as const,
          text: metadata.skills?.growth_areas || "_No growth areas specified_"
        }
      ]
    },
    {
      type: "divider" as const
    },
    {
      type: "section" as const,
      text: {
        type: "mrkdwn" as const,
        text: `*Key Strengths:*\n${metadata.overall?.strengths || "_Not provided_"}`
      }
    },
    {
      type: "section" as const,
      text: {
        type: "mrkdwn" as const,
        text: `*Areas for Improvement:*\n${metadata.overall?.improvements || "Not specified"}`
      }
    },
    ...(metadata.overall?.additional ? [{
      type: "section" as const,
      text: {
        type: "mrkdwn" as const,
        text: `*Additional Comments:*\n${metadata.overall.additional}`
      }
    }] : []),
    {
      type: "context" as const,
      elements: [
        {
          type: "mrkdwn" as const,
          text: `Submitted on <!date^${Math.floor(Date.now() / 1000)}^{date_pretty} at {time}|${new Date().toLocaleString()}>`
        }
      ]
    }
  ];
  
  return {
    text: `Feedback submitted for <@${metadata.selected_user}>`,
    blocks
  };
}
