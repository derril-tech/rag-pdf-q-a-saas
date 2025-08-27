import { z } from 'zod';

// Slack OAuth Installation
export const SlackInstallationSchema = z.object({
    team_id: z.string(),
    team_name: z.string(),
    enterprise_id: z.string().optional(),
    enterprise_name: z.string().optional(),
    bot_token: z.string(),
    bot_id: z.string(),
    bot_user_id: z.string(),
    bot_scopes: z.array(z.string()),
    user_id: z.string(),
    user_token: z.string().optional(),
    user_scopes: z.array(z.string()).optional(),
    incoming_webhook: z.object({
        url: z.string(),
        channel: z.string(),
        channel_id: z.string(),
        configuration_url: z.string(),
    }).optional(),
    app_id: z.string(),
    app_home_enabled: z.boolean().optional(),
    is_enterprise_install: z.boolean().optional(),
    token_type: z.enum(['bot', 'user']),
    authed_user: z.object({
        id: z.string(),
        scope: z.string(),
        access_token: z.string(),
        token_type: z.string(),
    }).optional(),
    scope: z.string(),
    installer_user_id: z.string().optional(),
    state: z.string().optional(),
});

export type SlackInstallation = z.infer<typeof SlackInstallationSchema>;

// Slack Event Types
export const SlackEventTypeSchema = z.enum([
    'app_mention',
    'message',
    'reaction_added',
    'reaction_removed',
    'channel_created',
    'channel_deleted',
    'channel_renamed',
    'team_join',
    'team_leave',
    'user_change',
    'user_deleted',
    'app_home_opened',
    'app_uninstalled',
]);

export type SlackEventType = z.infer<typeof SlackEventTypeSchema>;

// Base Slack Event
export const SlackEventSchema = z.object({
    type: SlackEventTypeSchema,
    event_id: z.string(),
    event_ts: z.string(),
    team_id: z.string(),
    user_id: z.string().optional(),
    channel_id: z.string().optional(),
    text: z.string().optional(),
    ts: z.string().optional(),
    thread_ts: z.string().optional(),
    parent_user_id: z.string().optional(),
    subtype: z.string().optional(),
    hidden: z.boolean().optional(),
    deleted_ts: z.string().optional(),
    event_time: z.number(),
});

export type SlackEvent = z.infer<typeof SlackEventSchema>;

// App Mention Event
export const SlackAppMentionEventSchema = SlackEventSchema.extend({
    type: z.literal('app_mention'),
    text: z.string(),
    user_id: z.string(),
    channel_id: z.string(),
    thread_ts: z.string().optional(),
});

export type SlackAppMentionEvent = z.infer<typeof SlackAppMentionEventSchema>;

// Message Event
export const SlackMessageEventSchema = SlackEventSchema.extend({
    type: z.literal('message'),
    text: z.string().optional(),
    user_id: z.string().optional(),
    channel_id: z.string().optional(),
    thread_ts: z.string().optional(),
    subtype: z.enum([
        'bot_message',
        'me_message',
        'channel_join',
        'channel_leave',
        'channel_topic',
        'channel_purpose',
        'channel_name',
        'channel_archive',
        'channel_unarchive',
        'group_join',
        'group_leave',
        'group_topic',
        'group_purpose',
        'group_name',
        'group_archive',
        'group_unarchive',
        'file_share',
        'file_comment',
        'file_mention',
        'pinned_item',
        'unpinned_item',
    ]).optional(),
});

export type SlackMessageEvent = z.infer<typeof SlackMessageEventSchema>;

// Reaction Event
export const SlackReactionEventSchema = SlackEventSchema.extend({
    type: z.enum(['reaction_added', 'reaction_removed']),
    user_id: z.string(),
    item: z.object({
        type: z.enum(['message', 'file', 'file_comment']),
        channel_id: z.string().optional(),
        ts: z.string().optional(),
        file_id: z.string().optional(),
        file_comment_id: z.string().optional(),
    }),
    reaction: z.string(),
    item_user_id: z.string().optional(),
});

export type SlackReactionEvent = z.infer<typeof SlackReactionEventSchema>;

// Channel Event
export const SlackChannelEventSchema = SlackEventSchema.extend({
    type: z.enum(['channel_created', 'channel_deleted', 'channel_renamed']),
    channel: z.object({
        id: z.string(),
        name: z.string(),
        name_normalized: z.string(),
        is_private: z.boolean().optional(),
        is_mpim: z.boolean().optional(),
        created: z.number().optional(),
        creator: z.string().optional(),
        is_archived: z.boolean().optional(),
        is_general: z.boolean().optional(),
        members: z.array(z.string()).optional(),
        topic: z.object({
            value: z.string(),
            creator: z.string(),
            last_set: z.number(),
        }).optional(),
        purpose: z.object({
            value: z.string(),
            creator: z.string(),
            last_set: z.number(),
        }).optional(),
    }),
});

export type SlackChannelEvent = z.infer<typeof SlackChannelEventSchema>;

// Team Event
export const SlackTeamEventSchema = SlackEventSchema.extend({
    type: z.enum(['team_join', 'team_leave']),
    user: z.object({
        id: z.string(),
        team_id: z.string(),
        name: z.string(),
        deleted: z.boolean().optional(),
        color: z.string().optional(),
        real_name: z.string().optional(),
        tz: z.string().optional(),
        tz_label: z.string().optional(),
        tz_offset: z.number().optional(),
        profile: z.object({
            avatar_hash: z.string().optional(),
            status_text: z.string().optional(),
            status_emoji: z.string().optional(),
            real_name: z.string().optional(),
            display_name: z.string().optional(),
            real_name_normalized: z.string().optional(),
            display_name_normalized: z.string().optional(),
            email: z.string().optional(),
            image_original: z.string().optional(),
            image_24: z.string().optional(),
            image_32: z.string().optional(),
            image_48: z.string().optional(),
            image_72: z.string().optional(),
            image_192: z.string().optional(),
            image_512: z.string().optional(),
            team: z.string().optional(),
        }).optional(),
        is_admin: z.boolean().optional(),
        is_owner: z.boolean().optional(),
        is_primary_owner: z.boolean().optional(),
        is_restricted: z.boolean().optional(),
        is_ultra_restricted: z.boolean().optional(),
        is_bot: z.boolean().optional(),
        updated: z.number().optional(),
        is_app_user: z.boolean().optional(),
        has_2fa: z.boolean().optional(),
    }).optional(),
});

export type SlackTeamEvent = z.infer<typeof SlackTeamEventSchema>;

// User Change Event
export const SlackUserChangeEventSchema = SlackEventSchema.extend({
    type: z.literal('user_change'),
    user: z.object({
        id: z.string(),
        team_id: z.string(),
        name: z.string(),
        deleted: z.boolean().optional(),
        color: z.string().optional(),
        real_name: z.string().optional(),
        tz: z.string().optional(),
        tz_label: z.string().optional(),
        tz_offset: z.number().optional(),
        profile: z.object({
            avatar_hash: z.string().optional(),
            status_text: z.string().optional(),
            status_emoji: z.string().optional(),
            real_name: z.string().optional(),
            display_name: z.string().optional(),
            real_name_normalized: z.string().optional(),
            display_name_normalized: z.string().optional(),
            email: z.string().optional(),
            image_original: z.string().optional(),
            image_24: z.string().optional(),
            image_32: z.string().optional(),
            image_48: z.string().optional(),
            image_72: z.string().optional(),
            image_192: z.string().optional(),
            image_512: z.string().optional(),
            team: z.string().optional(),
        }).optional(),
        is_admin: z.boolean().optional(),
        is_owner: z.boolean().optional(),
        is_primary_owner: z.boolean().optional(),
        is_restricted: z.boolean().optional(),
        is_ultra_restricted: z.boolean().optional(),
        is_bot: z.boolean().optional(),
        updated: z.number().optional(),
        is_app_user: z.boolean().optional(),
        has_2fa: z.boolean().optional(),
    }),
});

export type SlackUserChangeEvent = z.infer<typeof SlackUserChangeEventSchema>;

// App Home Opened Event
export const SlackAppHomeOpenedEventSchema = SlackEventSchema.extend({
    type: z.literal('app_home_opened'),
    user_id: z.string(),
    channel_id: z.string(),
    event_ts: z.string(),
    tab: z.enum(['home', 'messages']),
    view: z.object({
        id: z.string(),
        team_id: z.string(),
        type: z.string(),
        blocks: z.array(z.any()).optional(),
        private_metadata: z.string().optional(),
        callback_id: z.string().optional(),
        state: z.object({
            values: z.record(z.any()),
        }).optional(),
        hash: z.string().optional(),
        clear_on_close: z.boolean().optional(),
        notify_on_close: z.boolean().optional(),
        close: z.object({
            type: z.string(),
            text: z.object({
                type: z.string(),
                text: z.string(),
                emoji: z.boolean().optional(),
            }),
            confirm: z.object({
                title: z.object({
                    type: z.string(),
                    text: z.string(),
                    emoji: z.boolean().optional(),
                }),
                text: z.object({
                    type: z.string(),
                    text: z.string(),
                    emoji: z.boolean().optional(),
                }),
                confirm: z.object({
                    type: z.string(),
                    text: z.string(),
                    emoji: z.boolean().optional(),
                }),
                deny: z.object({
                    type: z.string(),
                    text: z.string(),
                    emoji: z.boolean().optional(),
                }),
                style: z.string().optional(),
            }).optional(),
        }).optional(),
        submit: z.object({
            type: z.string(),
            text: z.object({
                type: z.string(),
                text: z.string(),
                emoji: z.boolean().optional(),
            }),
        }).optional(),
        title: z.object({
            type: z.string(),
            text: z.string(),
            emoji: z.boolean().optional(),
        }).optional(),
        external_id: z.string().optional(),
        submit_disabled: z.boolean().optional(),
        root_view_id: z.string().optional(),
        app_id: z.string().optional(),
        app_installed_team_id: z.string().optional(),
        bot_id: z.string().optional(),
    }).optional(),
});

export type SlackAppHomeOpenedEvent = z.infer<typeof SlackAppHomeOpenedEventSchema>;

// App Uninstalled Event
export const SlackAppUninstalledEventSchema = SlackEventSchema.extend({
    type: z.literal('app_uninstalled'),
});

export type SlackAppUninstalledEvent = z.infer<typeof SlackAppUninstalledEventSchema>;

// Union of all Slack events
export const SlackEventUnionSchema = z.union([
    SlackAppMentionEventSchema,
    SlackMessageEventSchema,
    SlackReactionEventSchema,
    SlackChannelEventSchema,
    SlackTeamEventSchema,
    SlackUserChangeEventSchema,
    SlackAppHomeOpenedEventSchema,
    SlackAppUninstalledEventSchema,
]);

export type SlackEventUnion = z.infer<typeof SlackEventUnionSchema>;

// Slack Event Wrapper
export const SlackEventWrapperSchema = z.object({
    token: z.string(),
    team_id: z.string(),
    api_app_id: z.string(),
    event: SlackEventUnionSchema,
    type: z.literal('event_callback'),
    event_id: z.string(),
    event_time: z.number(),
    authorizations: z.array(z.object({
        enterprise_id: z.string().optional(),
        team_id: z.string(),
        user_id: z.string(),
        is_bot: z.boolean(),
        is_enterprise_install: z.boolean().optional(),
    })).optional(),
    is_ext_shared_channel: z.boolean().optional(),
    event_context: z.string().optional(),
});

export type SlackEventWrapper = z.infer<typeof SlackEventWrapperSchema>;

// Slack Slash Command
export const SlackSlashCommandSchema = z.object({
    token: z.string(),
    team_id: z.string(),
    team_domain: z.string(),
    enterprise_id: z.string().optional(),
    enterprise_name: z.string().optional(),
    channel_id: z.string(),
    channel_name: z.string(),
    user_id: z.string(),
    user_name: z.string(),
    command: z.string(),
    text: z.string(),
    response_url: z.string(),
    trigger_id: z.string(),
    api_app_id: z.string(),
});

export type SlackSlashCommand = z.infer<typeof SlackSlashCommandSchema>;

// Slack Interactive Component
export const SlackInteractiveComponentSchema = z.object({
    type: z.enum(['block_actions', 'block_suggestion', 'view_submission', 'view_closed']),
    user: z.object({
        id: z.string(),
        username: z.string().optional(),
        name: z.string().optional(),
        team_id: z.string(),
    }),
    api_app_id: z.string(),
    token: z.string(),
    container: z.object({
        type: z.enum(['message', 'view']),
        message_ts: z.string().optional(),
        channel_id: z.string().optional(),
        view_id: z.string().optional(),
        is_ephemeral: z.boolean().optional(),
    }),
    trigger_id: z.string(),
    team: z.object({
        id: z.string(),
        domain: z.string(),
        enterprise_id: z.string().optional(),
        enterprise_name: z.string().optional(),
    }),
    enterprise: z.object({
        id: z.string(),
        name: z.string(),
    }).optional(),
    is_enterprise_install: z.boolean().optional(),
    channel: z.object({
        id: z.string(),
        name: z.string(),
    }).optional(),
    message: z.object({
        type: z.string(),
        user: z.string(),
        text: z.string(),
        ts: z.string(),
        team: z.string(),
        blocks: z.array(z.any()).optional(),
    }).optional(),
    state: z.object({
        values: z.record(z.any()),
    }).optional(),
    hash: z.string().optional(),
    response_url: z.string().optional(),
    actions: z.array(z.any()).optional(),
    view: z.object({
        id: z.string(),
        team_id: z.string(),
        type: z.string(),
        blocks: z.array(z.any()).optional(),
        private_metadata: z.string().optional(),
        callback_id: z.string().optional(),
        state: z.object({
            values: z.record(z.any()),
        }).optional(),
        hash: z.string().optional(),
        clear_on_close: z.boolean().optional(),
        notify_on_close: z.boolean().optional(),
        close: z.object({
            type: z.string(),
            text: z.object({
                type: z.string(),
                text: z.string(),
                emoji: z.boolean().optional(),
            }),
            confirm: z.object({
                title: z.object({
                    type: z.string(),
                    text: z.string(),
                    emoji: z.boolean().optional(),
                }),
                text: z.object({
                    type: z.string(),
                    text: z.string(),
                    emoji: z.boolean().optional(),
                }),
                confirm: z.object({
                    type: z.string(),
                    text: z.string(),
                    emoji: z.boolean().optional(),
                }),
                deny: z.object({
                    type: z.string(),
                    text: z.string(),
                    emoji: z.boolean().optional(),
                }),
                style: z.string().optional(),
            }).optional(),
        }).optional(),
        submit: z.object({
            type: z.string(),
            text: z.object({
                type: z.string(),
                text: z.string(),
                emoji: z.boolean().optional(),
            }),
        }).optional(),
        title: z.object({
            type: z.string(),
            text: z.string(),
            emoji: z.boolean().optional(),
        }).optional(),
        external_id: z.string().optional(),
        submit_disabled: z.boolean().optional(),
        root_view_id: z.string().optional(),
        app_id: z.string().optional(),
        app_installed_team_id: z.string().optional(),
        bot_id: z.string().optional(),
    }).optional(),
});

export type SlackInteractiveComponent = z.infer<typeof SlackInteractiveComponentSchema>;

// Slack URL Verification
export const SlackUrlVerificationSchema = z.object({
    token: z.string(),
    challenge: z.string(),
    type: z.literal('url_verification'),
});

export type SlackUrlVerification = z.infer<typeof SlackUrlVerificationSchema>;

// Slack Request Union
export const SlackRequestSchema = z.union([
    SlackEventWrapperSchema,
    SlackSlashCommandSchema,
    SlackInteractiveComponentSchema,
    SlackUrlVerificationSchema,
]);

export type SlackRequest = z.infer<typeof SlackRequestSchema>;

// Slack Response
export const SlackResponseSchema = z.object({
    response_type: z.enum(['in_channel', 'ephemeral']).optional(),
    text: z.string().optional(),
    blocks: z.array(z.any()).optional(),
    attachments: z.array(z.any()).optional(),
    thread_ts: z.string().optional(),
    replace_original: z.boolean().optional(),
    delete_original: z.boolean().optional(),
    unfurl_links: z.boolean().optional(),
    unfurl_media: z.boolean().optional(),
});

export type SlackResponse = z.infer<typeof SlackResponseSchema>;

// Slack Workspace Info
export const SlackWorkspaceSchema = z.object({
    id: z.string(),
    name: z.string(),
    domain: z.string(),
    email_domain: z.string().optional(),
    icon: z.object({
        image_34: z.string().optional(),
        image_44: z.string().optional(),
        image_68: z.string().optional(),
        image_88: z.string().optional(),
        image_102: z.string().optional(),
        image_132: z.string().optional(),
        image_default: z.boolean().optional(),
    }).optional(),
    enterprise_id: z.string().optional(),
    enterprise_name: z.string().optional(),
    default_channels: z.array(z.string()).optional(),
    is_verified: z.boolean().optional(),
    plan: z.string().optional(),
});

export type SlackWorkspace = z.infer<typeof SlackWorkspaceSchema>;

// Slack Channel Info
export const SlackChannelSchema = z.object({
    id: z.string(),
    name: z.string(),
    name_normalized: z.string(),
    is_private: z.boolean(),
    is_mpim: z.boolean(),
    created: z.number(),
    creator: z.string(),
    is_archived: z.boolean(),
    is_general: z.boolean(),
    members: z.array(z.string()),
    topic: z.object({
        value: z.string(),
        creator: z.string(),
        last_set: z.number(),
    }).optional(),
    purpose: z.object({
        value: z.string(),
        creator: z.string(),
        last_set: z.number(),
    }).optional(),
    previous_names: z.array(z.string()).optional(),
    num_members: z.number().optional(),
});

export type SlackChannel = z.infer<typeof SlackChannelSchema>;

// Slack User Info
export const SlackUserSchema = z.object({
    id: z.string(),
    team_id: z.string(),
    name: z.string(),
    deleted: z.boolean().optional(),
    color: z.string().optional(),
    real_name: z.string().optional(),
    tz: z.string().optional(),
    tz_label: z.string().optional(),
    tz_offset: z.number().optional(),
    profile: z.object({
        avatar_hash: z.string().optional(),
        status_text: z.string().optional(),
        status_emoji: z.string().optional(),
        real_name: z.string().optional(),
        display_name: z.string().optional(),
        real_name_normalized: z.string().optional(),
        display_name_normalized: z.string().optional(),
        email: z.string().optional(),
        image_original: z.string().optional(),
        image_24: z.string().optional(),
        image_32: z.string().optional(),
        image_48: z.string().optional(),
        image_72: z.string().optional(),
        image_192: z.string().optional(),
        image_512: z.string().optional(),
        team: z.string().optional(),
    }).optional(),
    is_admin: z.boolean().optional(),
    is_owner: z.boolean().optional(),
    is_primary_owner: z.boolean().optional(),
    is_restricted: z.boolean().optional(),
    is_ultra_restricted: z.boolean().optional(),
    is_bot: z.boolean().optional(),
    updated: z.number().optional(),
    is_app_user: z.boolean().optional(),
    has_2fa: z.boolean().optional(),
});

export type SlackUser = z.infer<typeof SlackUserSchema>;

// Export all schemas
export const SlackSchemas = {
    Installation: SlackInstallationSchema,
    EventType: SlackEventTypeSchema,
    Event: SlackEventSchema,
    AppMentionEvent: SlackAppMentionEventSchema,
    MessageEvent: SlackMessageEventSchema,
    ReactionEvent: SlackReactionEventSchema,
    ChannelEvent: SlackChannelEventSchema,
    TeamEvent: SlackTeamEventSchema,
    UserChangeEvent: SlackUserChangeEventSchema,
    AppHomeOpenedEvent: SlackAppHomeOpenedEventSchema,
    AppUninstalledEvent: SlackAppUninstalledEventSchema,
    EventUnion: SlackEventUnionSchema,
    EventWrapper: SlackEventWrapperSchema,
    SlashCommand: SlackSlashCommandSchema,
    InteractiveComponent: SlackInteractiveComponentSchema,
    UrlVerification: SlackUrlVerificationSchema,
    Request: SlackRequestSchema,
    Response: SlackResponseSchema,
    Workspace: SlackWorkspaceSchema,
    Channel: SlackChannelSchema,
    User: SlackUserSchema,
} as const;
