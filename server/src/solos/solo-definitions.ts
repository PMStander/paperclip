import type { SoloDefinition } from "./solo-types.js";

// ─── Bundled Solo Definitions ───────────────────────────────────────────────
// Ported from OpenFang HAND.toml files, adapted for Paperclip.

export const BUNDLED_SOLOS: Record<string, SoloDefinition> = {
    // ═══════════════════════════════════════════════════════════════════════════
    // Browser Solo
    // ═══════════════════════════════════════════════════════════════════════════
    browser: {
        id: "browser",
        name: "Browser Solo",
        description:
            "Autonomous web browser — navigates sites, fills forms, clicks buttons, and completes multi-step web tasks with user approval for purchases",
        category: "productivity",
        icon: "🌐",
        tools: [
            "browser_navigate", "browser_click", "browser_type",
            "browser_screenshot", "browser_read_page", "browser_close",
            "web_search", "web_fetch",
            "memory_store", "memory_recall",
            "knowledge_add_entity", "knowledge_add_relation", "knowledge_query",
            "schedule_create", "schedule_list", "schedule_delete",
            "file_write", "file_read",
        ],
        requires: [
            {
                key: "python3",
                label: "Python 3 must be installed",
                requirement_type: "binary",
                check_value: "python",
                description: "Python 3 is required to run Playwright, the browser automation library that powers this solo.",
                install: {
                    macos: "brew install python3",
                    windows: "winget install Python.Python.3.12",
                    linux_apt: "sudo apt install python3",
                    linux_dnf: "sudo dnf install python3",
                    linux_pacman: "sudo pacman -S python",
                    manual_url: "https://www.python.org/downloads/",
                    estimated_time: "2-5 min",
                },
            },
            {
                key: "playwright",
                label: "Playwright must be installed",
                requirement_type: "binary",
                check_value: "playwright",
                description: "Playwright is a browser automation framework. After installing via pip, you also need to install browser binaries.",
                install: {
                    macos: "pip3 install playwright && playwright install chromium",
                    windows: "pip install playwright && playwright install chromium",
                    linux_apt: "pip3 install playwright && playwright install chromium",
                    pip: "pip install playwright && playwright install chromium",
                    manual_url: "https://playwright.dev/python/docs/intro",
                    estimated_time: "3-5 min",
                    steps: [
                        "Install Playwright: pip install playwright",
                        "Install browser binaries: playwright install chromium",
                    ],
                },
            },
        ],
        settings: [
            {
                key: "task_description",
                label: "Task Description",
                description: "Describe what the browser should do (e.g. 'Find the best price for iPhone 16 on Amazon and eBay')",
                setting_type: "text",
                default: "",
            },
            {
                key: "start_url",
                label: "Start URL",
                description: "Initial URL to navigate to (leave empty to let the solo decide based on the task)",
                setting_type: "text",
                default: "",
            },
            {
                key: "browser_type",
                label: "Browser",
                description: "Which browser to automate",
                setting_type: "select",
                default: "chromium",
                options: [
                    { value: "chromium", label: "Chromium (recommended)" },
                    { value: "firefox", label: "Firefox" },
                    { value: "webkit", label: "WebKit (Safari engine)" },
                ],
            },
            {
                key: "headless",
                label: "Headless Mode",
                description: "Run the browser without a visible window (recommended for servers)",
                setting_type: "toggle",
                default: "true",
            },
            {
                key: "approval_mode",
                label: "Purchase Approval",
                description: "Require explicit user confirmation before completing any purchase or payment",
                setting_type: "toggle",
                default: "true",
            },
            {
                key: "max_pages_per_task",
                label: "Max Pages Per Task",
                description: "Maximum number of page navigations allowed per task to prevent runaway browsing",
                setting_type: "select",
                default: "20",
                options: [
                    { value: "10", label: "10 pages (conservative)" },
                    { value: "20", label: "20 pages (balanced)" },
                    { value: "50", label: "50 pages (thorough)" },
                ],
            },
            {
                key: "default_wait",
                label: "Default Wait After Action",
                description: "How long to wait after clicking or navigating for the page to settle",
                setting_type: "select",
                default: "auto",
                options: [
                    { value: "auto", label: "Auto-detect (wait for DOM)" },
                    { value: "1", label: "1 second" },
                    { value: "3", label: "3 seconds" },
                ],
            },
            {
                key: "screenshot_on_action",
                label: "Screenshot After Actions",
                description: "Automatically take a screenshot after every click/navigate for visual verification",
                setting_type: "toggle",
                default: "false",
            },
        ],
        agent: {
            name: "browser-solo",
            description: "AI web browser — navigates websites, fills forms, searches products, and completes multi-step web tasks autonomously with safety guardrails",
            module: "builtin:chat",
            provider: "default",
            model: "default",
            max_tokens: 16384,
            temperature: 0.3,
            max_iterations: 60,
            system_prompt: `You are Browser Solo — an autonomous web browser agent that interacts with real websites on behalf of the user. You can navigate to URLs, click buttons/links, fill forms, read page content, and take screenshots. Follow a multi-phase approach: understand the task, navigate & observe, interact, and report results. CRITICAL: Never auto-complete purchases without explicit user approval. Never store passwords or credit card numbers.`,
        },
        dashboard: {
            metrics: [
                { label: "Pages Visited", memory_key: "browser_solo_pages_visited", format: "number" },
                { label: "Tasks Completed", memory_key: "browser_solo_tasks_completed", format: "number" },
                { label: "Screenshots", memory_key: "browser_solo_screenshots_taken", format: "number" },
            ],
        },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // Clip Solo
    // ═══════════════════════════════════════════════════════════════════════════
    clip: {
        id: "clip",
        name: "Clip Solo",
        description:
            "Turns long-form video into viral short clips with captions and thumbnails",
        category: "content",
        icon: "🎬",
        tools: ["shell_exec", "file_read", "file_write", "file_list", "web_fetch", "memory_store", "memory_recall"],
        requires: [
            {
                key: "ffmpeg",
                label: "FFmpeg must be installed",
                requirement_type: "binary",
                check_value: "ffmpeg",
                description: "FFmpeg is the core video processing engine used to extract clips, burn captions, crop to vertical, and generate thumbnails.",
                install: {
                    macos: "brew install ffmpeg",
                    windows: "winget install Gyan.FFmpeg",
                    linux_apt: "sudo apt install ffmpeg",
                    linux_dnf: "sudo dnf install ffmpeg-free",
                    linux_pacman: "sudo pacman -S ffmpeg",
                    manual_url: "https://ffmpeg.org/download.html",
                    estimated_time: "2-5 min",
                },
            },
            {
                key: "ffprobe",
                label: "FFprobe must be installed (ships with FFmpeg)",
                requirement_type: "binary",
                check_value: "ffprobe",
                description: "FFprobe analyzes video metadata (duration, resolution, codecs). It ships bundled with FFmpeg.",
                install: {
                    macos: "brew install ffmpeg",
                    windows: "winget install Gyan.FFmpeg",
                    linux_apt: "sudo apt install ffmpeg",
                    manual_url: "https://ffmpeg.org/download.html",
                    estimated_time: "Bundled with FFmpeg",
                },
            },
            {
                key: "yt-dlp",
                label: "yt-dlp must be installed",
                requirement_type: "binary",
                check_value: "yt-dlp",
                description: "yt-dlp downloads videos from YouTube, Vimeo, Twitter, and 1000+ other sites.",
                install: {
                    macos: "brew install yt-dlp",
                    windows: "winget install yt-dlp.yt-dlp",
                    linux_apt: "sudo apt install yt-dlp",
                    pip: "pip install yt-dlp",
                    manual_url: "https://github.com/yt-dlp/yt-dlp#installation",
                    estimated_time: "1-2 min",
                },
            },
        ],
        settings: [
            {
                key: "source_url",
                label: "Source Video URL",
                description: "URL of the video to process (YouTube, Vimeo, Twitter, or any yt-dlp supported site)",
                setting_type: "text",
                default: "",
            },
            {
                key: "clip_count",
                label: "Number of Clips",
                description: "How many short clips to extract from the source video",
                setting_type: "select",
                default: "5",
                options: [
                    { value: "3", label: "3 clips" },
                    { value: "5", label: "5 clips" },
                    { value: "10", label: "10 clips" },
                    { value: "auto", label: "Auto (based on video length)" },
                ],
            },
            {
                key: "clip_duration",
                label: "Target Clip Duration",
                description: "Ideal length for each extracted clip",
                setting_type: "select",
                default: "60",
                options: [
                    { value: "30", label: "30 seconds (TikTok/Reels)" },
                    { value: "60", label: "60 seconds (Shorts/Reels)" },
                    { value: "90", label: "90 seconds" },
                    { value: "180", label: "3 minutes" },
                ],
            },
            {
                key: "output_format",
                label: "Output Format",
                description: "Aspect ratio and format for the output clips",
                setting_type: "select",
                default: "vertical",
                options: [
                    { value: "vertical", label: "Vertical 9:16 (TikTok/Reels/Shorts)" },
                    { value: "square", label: "Square 1:1 (Instagram)" },
                    { value: "horizontal", label: "Horizontal 16:9 (YouTube)" },
                ],
            },
            {
                key: "stt_provider",
                label: "Speech-to-Text Provider",
                description: "How audio is transcribed to text for captions and clip selection",
                setting_type: "select",
                default: "auto",
                options: [
                    { value: "auto", label: "Auto-detect (best available)" },
                    { value: "whisper_local", label: "Local Whisper", binary: "whisper" },
                    { value: "groq_whisper", label: "Groq Whisper API (fast, free tier)", provider_env: "GROQ_API_KEY" },
                    { value: "openai_whisper", label: "OpenAI Whisper API", provider_env: "OPENAI_API_KEY" },
                    { value: "deepgram", label: "Deepgram Nova-2", provider_env: "DEEPGRAM_API_KEY" },
                ],
            },
            {
                key: "tts_provider",
                label: "Text-to-Speech Provider",
                description: "Optional voice-over or narration generation for clips",
                setting_type: "select",
                default: "none",
                options: [
                    { value: "none", label: "Disabled (captions only)" },
                    { value: "edge_tts", label: "Edge TTS (free)", binary: "edge-tts" },
                    { value: "openai_tts", label: "OpenAI TTS", provider_env: "OPENAI_API_KEY" },
                    { value: "elevenlabs", label: "ElevenLabs", provider_env: "ELEVENLABS_API_KEY" },
                ],
            },
            {
                key: "elevenlabs_api_key",
                label: "ElevenLabs API Key",
                description: "API key from elevenlabs.io for high-quality text-to-speech. Required when ElevenLabs TTS is selected.",
                setting_type: "text",
                env_var: "ELEVENLABS_API_KEY",
                default: "",
            },
            {
                key: "publish_target",
                label: "Publish Clips To",
                description: "Where to send finished clips after processing. Leave as 'Local only' to skip publishing.",
                setting_type: "select",
                default: "local_only",
                options: [
                    { value: "local_only", label: "Local only (no publishing)" },
                    { value: "telegram", label: "Telegram channel" },
                    { value: "whatsapp", label: "WhatsApp contact/group" },
                    { value: "both", label: "Telegram + WhatsApp" },
                ],
            },
            {
                key: "telegram_bot_token",
                label: "Telegram Bot Token",
                description: "From @BotFather on Telegram. Bot must be admin in the target channel.",
                setting_type: "text",
                default: "",
            },
            {
                key: "telegram_chat_id",
                label: "Telegram Chat ID",
                description: "Channel: -100XXXXXXXXXX or @channelname.",
                setting_type: "text",
                default: "",
            },
            {
                key: "whatsapp_token",
                label: "WhatsApp Access Token",
                description: "Permanent token from Meta Business Settings > System Users.",
                setting_type: "text",
                default: "",
            },
            {
                key: "whatsapp_phone_id",
                label: "WhatsApp Phone Number ID",
                description: "From Meta Developer Portal > WhatsApp > API Setup.",
                setting_type: "text",
                default: "",
            },
            {
                key: "whatsapp_recipient",
                label: "WhatsApp Recipient",
                description: "Phone number in international format, no + or spaces (e.g. 14155551234).",
                setting_type: "text",
                default: "",
            },
        ],
        agent: {
            name: "clip-solo",
            description: "AI video editor — downloads, transcribes, and creates viral short clips from any video URL or file",
            module: "builtin:chat",
            provider: "default",
            model: "default",
            max_tokens: 8192,
            temperature: 0.4,
            max_iterations: 40,
            system_prompt: `You are Clip Solo — an AI-powered shorts factory that turns any video URL or file into viral short clips. Follow the pipeline: Intake → Download → Transcribe → Analyze → Extract → TTS (optional) → Publish (optional) → Report. Use shell_exec for all commands. Never fabricate output. Use file_write for creating SRT/text files.`,
        },
        dashboard: {
            metrics: [
                { label: "Jobs Completed", memory_key: "clip_solo_jobs_completed", format: "number" },
                { label: "Clips Generated", memory_key: "clip_solo_clips_generated", format: "number" },
                { label: "Total Duration", memory_key: "clip_solo_total_duration_secs", format: "duration" },
                { label: "Published to Telegram", memory_key: "clip_solo_clips_published_telegram", format: "number" },
                { label: "Published to WhatsApp", memory_key: "clip_solo_clips_published_whatsapp", format: "number" },
            ],
        },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // Collector Solo
    // ═══════════════════════════════════════════════════════════════════════════
    collector: {
        id: "collector",
        name: "Collector Solo",
        description:
            "Autonomous intelligence collector — monitors any target continuously with change detection and knowledge graphs",
        category: "data",
        icon: "🔍",
        tools: [
            "shell_exec", "file_read", "file_write", "file_list",
            "web_fetch", "web_search", "memory_store", "memory_recall",
            "schedule_create", "schedule_list", "schedule_delete",
            "knowledge_add_entity", "knowledge_add_relation", "knowledge_query",
            "event_publish",
        ],
        settings: [
            {
                key: "target_subject",
                label: "Target Subject",
                description: "What to monitor (company name, person, technology, market, topic)",
                setting_type: "text",
                default: "",
            },
            {
                key: "collection_depth",
                label: "Collection Depth",
                description: "How deep to dig on each cycle",
                setting_type: "select",
                default: "deep",
                options: [
                    { value: "surface", label: "Surface (headlines only)" },
                    { value: "deep", label: "Deep (full articles + sources)" },
                    { value: "exhaustive", label: "Exhaustive (multi-hop research)" },
                ],
            },
            {
                key: "update_frequency",
                label: "Update Frequency",
                description: "How often to run collection sweeps",
                setting_type: "select",
                default: "daily",
                options: [
                    { value: "hourly", label: "Every hour" },
                    { value: "every_6h", label: "Every 6 hours" },
                    { value: "daily", label: "Daily" },
                    { value: "weekly", label: "Weekly" },
                ],
            },
            {
                key: "focus_area",
                label: "Focus Area",
                description: "Lens through which to analyze collected intelligence",
                setting_type: "select",
                default: "general",
                options: [
                    { value: "market", label: "Market Intelligence" },
                    { value: "business", label: "Business Intelligence" },
                    { value: "competitor", label: "Competitor Analysis" },
                    { value: "person", label: "Person Tracking" },
                    { value: "technology", label: "Technology Monitoring" },
                    { value: "general", label: "General Intelligence" },
                ],
            },
            {
                key: "alert_on_changes",
                label: "Alert on Changes",
                description: "Publish an event when significant changes are detected",
                setting_type: "toggle",
                default: "true",
            },
            {
                key: "report_format",
                label: "Report Format",
                description: "Output format for intelligence reports",
                setting_type: "select",
                default: "markdown",
                options: [
                    { value: "markdown", label: "Markdown" },
                    { value: "json", label: "JSON" },
                    { value: "html", label: "HTML" },
                ],
            },
            {
                key: "max_sources_per_cycle",
                label: "Max Sources Per Cycle",
                description: "Maximum number of sources to process per collection sweep",
                setting_type: "select",
                default: "30",
                options: [
                    { value: "10", label: "10 sources" },
                    { value: "30", label: "30 sources" },
                    { value: "50", label: "50 sources" },
                    { value: "100", label: "100 sources" },
                ],
            },
            {
                key: "track_sentiment",
                label: "Track Sentiment",
                description: "Analyze and track sentiment trends over time",
                setting_type: "toggle",
                default: "false",
            },
        ],
        agent: {
            name: "collector-solo",
            description: "AI intelligence collector — monitors any target continuously with OSINT techniques, knowledge graphs, and change detection",
            module: "builtin:chat",
            provider: "default",
            model: "default",
            max_tokens: 16384,
            temperature: 0.3,
            max_iterations: 60,
            system_prompt: `You are Collector Solo — an autonomous intelligence collector that monitors any target 24/7, building a living knowledge graph and detecting changes over time. Follow the phases: Schedule & Init → Source Discovery → Collection Sweep → Knowledge Graph → Change Detection → Report → Persist State. Never fabricate intelligence.`,
        },
        dashboard: {
            metrics: [
                { label: "Data Points", memory_key: "collector_solo_data_points", format: "number" },
                { label: "Entities Tracked", memory_key: "collector_solo_entities_tracked", format: "number" },
                { label: "Reports Generated", memory_key: "collector_solo_reports_generated", format: "number" },
                { label: "Last Update", memory_key: "collector_solo_last_update", format: "text" },
            ],
        },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // Lead Solo
    // ═══════════════════════════════════════════════════════════════════════════
    lead: {
        id: "lead",
        name: "Lead Solo",
        description:
            "Autonomous lead generation — discovers, enriches, and delivers qualified leads on a schedule",
        category: "data",
        icon: "📊",
        tools: [
            "shell_exec", "file_read", "file_write", "file_list",
            "web_fetch", "web_search", "memory_store", "memory_recall",
            "schedule_create", "schedule_list", "schedule_delete",
            "knowledge_add_entity", "knowledge_add_relation", "knowledge_query",
        ],
        settings: [
            {
                key: "target_industry",
                label: "Target Industry",
                description: "Industry vertical to focus on (e.g. SaaS, fintech, healthcare, e-commerce)",
                setting_type: "text",
                default: "",
            },
            {
                key: "target_role",
                label: "Target Role",
                description: "Decision-maker titles to target (e.g. CTO, VP Engineering, Head of Product)",
                setting_type: "text",
                default: "",
            },
            {
                key: "company_size",
                label: "Company Size",
                description: "Filter leads by company size",
                setting_type: "select",
                default: "any",
                options: [
                    { value: "any", label: "Any size" },
                    { value: "startup", label: "Startup (1-50)" },
                    { value: "smb", label: "SMB (50-500)" },
                    { value: "enterprise", label: "Enterprise (500+)" },
                ],
            },
            {
                key: "lead_source",
                label: "Lead Source",
                description: "Primary method for discovering leads",
                setting_type: "select",
                default: "web_search",
                options: [
                    { value: "web_search", label: "Web Search" },
                    { value: "linkedin_public", label: "LinkedIn (public profiles)" },
                    { value: "crunchbase", label: "Crunchbase" },
                    { value: "custom", label: "Custom (specify in prompt)" },
                ],
            },
            {
                key: "output_format",
                label: "Output Format",
                description: "Report delivery format",
                setting_type: "select",
                default: "csv",
                options: [
                    { value: "csv", label: "CSV" },
                    { value: "json", label: "JSON" },
                    { value: "markdown_table", label: "Markdown Table" },
                ],
            },
            {
                key: "leads_per_report",
                label: "Leads Per Report",
                description: "Number of leads to include in each report",
                setting_type: "select",
                default: "25",
                options: [
                    { value: "10", label: "10 leads" },
                    { value: "25", label: "25 leads" },
                    { value: "50", label: "50 leads" },
                    { value: "100", label: "100 leads" },
                ],
            },
            {
                key: "delivery_schedule",
                label: "Delivery Schedule",
                description: "When to generate and deliver lead reports",
                setting_type: "select",
                default: "daily_9am",
                options: [
                    { value: "daily_7am", label: "Daily at 7 AM" },
                    { value: "daily_9am", label: "Daily at 9 AM" },
                    { value: "weekdays_8am", label: "Weekdays at 8 AM" },
                    { value: "weekly_monday", label: "Weekly on Monday" },
                ],
            },
            {
                key: "geo_focus",
                label: "Geographic Focus",
                description: "Geographic region to prioritize (e.g. US, Europe, APAC, global)",
                setting_type: "text",
                default: "",
            },
            {
                key: "enrichment_depth",
                label: "Enrichment Depth",
                description: "How much context to gather per lead",
                setting_type: "select",
                default: "standard",
                options: [
                    { value: "basic", label: "Basic (name, title, company)" },
                    { value: "standard", label: "Standard (+ company size, industry, tech stack)" },
                    { value: "deep", label: "Deep (+ funding, recent news, social profiles)" },
                ],
            },
        ],
        agent: {
            name: "lead-solo",
            description: "AI lead generation engine — discovers, enriches, deduplicates, and delivers qualified leads on your schedule",
            module: "builtin:chat",
            provider: "default",
            model: "default",
            max_tokens: 16384,
            temperature: 0.3,
            max_iterations: 50,
            system_prompt: `You are Lead Solo — an autonomous lead generation engine that discovers, enriches, and delivers qualified leads 24/7. Follow the phases: State Recovery → Target Profile → Lead Discovery → Enrichment → Deduplication & Scoring → Report → Persist State. Never fabricate lead data. Only use publicly available information.`,
        },
        dashboard: {
            metrics: [
                { label: "Leads Found", memory_key: "lead_solo_leads_found", format: "number" },
                { label: "Reports Generated", memory_key: "lead_solo_reports_generated", format: "number" },
                { label: "Last Report", memory_key: "lead_solo_last_report_date", format: "text" },
                { label: "Unique Companies", memory_key: "lead_solo_unique_companies", format: "number" },
            ],
        },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // Predictor Solo
    // ═══════════════════════════════════════════════════════════════════════════
    predictor: {
        id: "predictor",
        name: "Predictor Solo",
        description:
            "Autonomous future predictor — collects signals, builds reasoning chains, makes calibrated predictions, and tracks accuracy",
        category: "data",
        icon: "🔮",
        tools: [
            "shell_exec", "file_read", "file_write", "file_list",
            "web_fetch", "web_search", "memory_store", "memory_recall",
            "schedule_create", "schedule_list", "schedule_delete",
            "knowledge_add_entity", "knowledge_add_relation", "knowledge_query",
        ],
        settings: [
            {
                key: "prediction_domain",
                label: "Prediction Domain",
                description: "Primary domain for predictions",
                setting_type: "select",
                default: "tech",
                options: [
                    { value: "tech", label: "Technology" },
                    { value: "finance", label: "Finance & Markets" },
                    { value: "geopolitics", label: "Geopolitics" },
                    { value: "climate", label: "Climate & Energy" },
                    { value: "general", label: "General (cross-domain)" },
                ],
            },
            {
                key: "time_horizon",
                label: "Time Horizon",
                description: "How far ahead to predict",
                setting_type: "select",
                default: "3_months",
                options: [
                    { value: "1_week", label: "1 week" },
                    { value: "1_month", label: "1 month" },
                    { value: "3_months", label: "3 months" },
                    { value: "1_year", label: "1 year" },
                ],
            },
            {
                key: "data_sources",
                label: "Data Sources",
                description: "What types of sources to monitor for signals",
                setting_type: "select",
                default: "all",
                options: [
                    { value: "news", label: "News only" },
                    { value: "social", label: "Social media" },
                    { value: "financial", label: "Financial data" },
                    { value: "academic", label: "Academic papers" },
                    { value: "all", label: "All sources" },
                ],
            },
            {
                key: "report_frequency",
                label: "Report Frequency",
                description: "How often to generate prediction reports",
                setting_type: "select",
                default: "weekly",
                options: [
                    { value: "daily", label: "Daily" },
                    { value: "weekly", label: "Weekly" },
                    { value: "biweekly", label: "Biweekly" },
                    { value: "monthly", label: "Monthly" },
                ],
            },
            {
                key: "predictions_per_report",
                label: "Predictions Per Report",
                description: "Number of predictions to include per report",
                setting_type: "select",
                default: "5",
                options: [
                    { value: "3", label: "3 predictions" },
                    { value: "5", label: "5 predictions" },
                    { value: "10", label: "10 predictions" },
                    { value: "20", label: "20 predictions" },
                ],
            },
            {
                key: "track_accuracy",
                label: "Track Accuracy",
                description: "Score past predictions when their time horizon expires",
                setting_type: "toggle",
                default: "true",
            },
            {
                key: "confidence_threshold",
                label: "Confidence Threshold",
                description: "Minimum confidence to include a prediction",
                setting_type: "select",
                default: "medium",
                options: [
                    { value: "low", label: "Low (20%+ confidence)" },
                    { value: "medium", label: "Medium (40%+ confidence)" },
                    { value: "high", label: "High (70%+ confidence)" },
                ],
            },
            {
                key: "contrarian_mode",
                label: "Contrarian Mode",
                description: "Actively seek and present counter-consensus predictions",
                setting_type: "toggle",
                default: "false",
            },
        ],
        agent: {
            name: "predictor-solo",
            description: "AI forecasting engine — collects signals, builds reasoning chains, makes calibrated predictions, and tracks accuracy over time",
            module: "builtin:chat",
            provider: "default",
            model: "default",
            max_tokens: 16384,
            temperature: 0.5,
            max_iterations: 60,
            system_prompt: `You are Predictor Solo — an autonomous forecasting engine inspired by superforecasting principles. Collect signals, build reasoning chains, make calibrated predictions, and rigorously track accuracy. Always make predictions specific and falsifiable. Never express 0% or 100% confidence. Track ALL predictions — don't selectively forget bad ones.`,
        },
        dashboard: {
            metrics: [
                { label: "Predictions Made", memory_key: "predictor_solo_predictions_made", format: "number" },
                { label: "Accuracy", memory_key: "predictor_solo_accuracy_pct", format: "percentage" },
                { label: "Reports Generated", memory_key: "predictor_solo_reports_generated", format: "number" },
                { label: "Active Predictions", memory_key: "predictor_solo_active_predictions", format: "number" },
            ],
        },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // Researcher Solo
    // ═══════════════════════════════════════════════════════════════════════════
    researcher: {
        id: "researcher",
        name: "Researcher Solo",
        description:
            "Autonomous deep researcher — exhaustive investigation, cross-referencing, fact-checking, and structured reports",
        category: "productivity",
        icon: "🧪",
        tools: [
            "shell_exec", "file_read", "file_write", "file_list",
            "web_fetch", "web_search", "memory_store", "memory_recall",
            "schedule_create", "schedule_list", "schedule_delete",
            "knowledge_add_entity", "knowledge_add_relation", "knowledge_query",
            "event_publish",
        ],
        settings: [
            {
                key: "research_topic",
                label: "Research Topic",
                description: "The question or topic to investigate (e.g. 'What are the best AI frameworks for building autonomous agents in 2025?')",
                setting_type: "text",
                default: "",
            },
            {
                key: "research_depth",
                label: "Research Depth",
                description: "How exhaustive each investigation should be",
                setting_type: "select",
                default: "thorough",
                options: [
                    { value: "quick", label: "Quick (5-10 sources, 1 pass)" },
                    { value: "thorough", label: "Thorough (20-30 sources, cross-referenced)" },
                    { value: "exhaustive", label: "Exhaustive (50+ sources, multi-pass, fact-checked)" },
                ],
            },
            {
                key: "output_style",
                label: "Output Style",
                description: "How to format research reports",
                setting_type: "select",
                default: "detailed",
                options: [
                    { value: "brief", label: "Brief (executive summary, 1-2 pages)" },
                    { value: "detailed", label: "Detailed (structured report, 5-10 pages)" },
                    { value: "academic", label: "Academic (formal paper style with citations)" },
                    { value: "executive", label: "Executive (key findings + recommendations)" },
                ],
            },
            {
                key: "source_verification",
                label: "Source Verification",
                description: "Cross-check claims across multiple sources before including",
                setting_type: "toggle",
                default: "true",
            },
            {
                key: "max_sources",
                label: "Max Sources",
                description: "Maximum number of sources to consult per investigation",
                setting_type: "select",
                default: "30",
                options: [
                    { value: "10", label: "10 sources" },
                    { value: "30", label: "30 sources" },
                    { value: "50", label: "50 sources" },
                    { value: "unlimited", label: "Unlimited" },
                ],
            },
            {
                key: "auto_follow_up",
                label: "Auto Follow-Up",
                description: "Automatically research follow-up questions discovered during investigation",
                setting_type: "toggle",
                default: "true",
            },
            {
                key: "save_research_log",
                label: "Save Research Log",
                description: "Save detailed search queries and source evaluation notes",
                setting_type: "toggle",
                default: "false",
            },
            {
                key: "citation_style",
                label: "Citation Style",
                description: "How to cite sources in reports",
                setting_type: "select",
                default: "inline_url",
                options: [
                    { value: "inline_url", label: "Inline URLs" },
                    { value: "footnotes", label: "Footnotes" },
                    { value: "academic_apa", label: "Academic (APA)" },
                    { value: "numbered", label: "Numbered references" },
                ],
            },
            {
                key: "language",
                label: "Language",
                description: "Primary language for research and output",
                setting_type: "select",
                default: "english",
                options: [
                    { value: "english", label: "English" },
                    { value: "spanish", label: "Spanish" },
                    { value: "french", label: "French" },
                    { value: "german", label: "German" },
                    { value: "chinese", label: "Chinese" },
                    { value: "japanese", label: "Japanese" },
                    { value: "auto", label: "Auto-detect" },
                ],
            },
        ],
        agent: {
            name: "researcher-solo",
            description: "AI deep researcher — conducts exhaustive investigations with cross-referencing, fact-checking, and structured reports",
            module: "builtin:chat",
            provider: "default",
            model: "default",
            max_tokens: 16384,
            temperature: 0.3,
            max_iterations: 80,
            system_prompt: `You are Researcher Solo — an autonomous deep research agent that conducts exhaustive investigations, cross-references sources, fact-checks claims, and produces comprehensive structured reports. Follow the phases: Question Analysis → Search Strategy → Information Gathering → Cross-Reference → Fact-Check → Report. NEVER fabricate sources or data.`,
        },
        dashboard: {
            metrics: [
                { label: "Queries Solved", memory_key: "researcher_solo_queries_solved", format: "number" },
                { label: "Sources Cited", memory_key: "researcher_solo_sources_cited", format: "number" },
                { label: "Reports Generated", memory_key: "researcher_solo_reports_generated", format: "number" },
                { label: "Active Investigations", memory_key: "researcher_solo_active_investigations", format: "number" },
            ],
        },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // Twitter Solo
    // ═══════════════════════════════════════════════════════════════════════════
    twitter: {
        id: "twitter",
        name: "Twitter Solo",
        description:
            "Autonomous Twitter/X manager — content creation, scheduled posting, engagement, and performance tracking",
        category: "communication",
        icon: "𝕏",
        tools: [
            "shell_exec", "file_read", "file_write", "file_list",
            "web_fetch", "web_search", "memory_store", "memory_recall",
            "schedule_create", "schedule_list", "schedule_delete",
            "knowledge_add_entity", "knowledge_add_relation", "knowledge_query",
            "event_publish",
        ],
        requires: [
            {
                key: "TWITTER_BEARER_TOKEN",
                label: "Twitter API Bearer Token",
                requirement_type: "api_key",
                check_value: "TWITTER_BEARER_TOKEN",
                description: "A Bearer Token from the Twitter/X Developer Portal. Required for reading and posting tweets via the Twitter API v2.",
                install: {
                    signup_url: "https://developer.twitter.com/en/portal/dashboard",
                    docs_url: "https://developer.twitter.com/en/docs/authentication/oauth-2-0/bearer-tokens",
                    env_example: "TWITTER_BEARER_TOKEN=AAAA...your_token_here",
                    estimated_time: "5-10 min",
                    steps: [
                        "Go to developer.twitter.com and sign in",
                        "Create a new Project and App",
                        "Navigate to 'Keys and tokens'",
                        "Generate a Bearer Token",
                        "Copy and set as environment variable",
                    ],
                },
            },
        ],
        settings: [
            {
                key: "twitter_bearer_token",
                label: "Twitter Bearer Token",
                description: "Bearer Token from the Twitter/X Developer Portal.",
                setting_type: "text",
                default: "",
            },
            {
                key: "twitter_style",
                label: "Content Style",
                description: "Voice and tone for your tweets",
                setting_type: "select",
                default: "professional",
                options: [
                    { value: "professional", label: "Professional" },
                    { value: "casual", label: "Casual" },
                    { value: "witty", label: "Witty" },
                    { value: "educational", label: "Educational" },
                    { value: "provocative", label: "Provocative" },
                    { value: "inspirational", label: "Inspirational" },
                ],
            },
            {
                key: "post_frequency",
                label: "Post Frequency",
                description: "How often to create and post content",
                setting_type: "select",
                default: "3_daily",
                options: [
                    { value: "1_daily", label: "1 per day" },
                    { value: "3_daily", label: "3 per day" },
                    { value: "5_daily", label: "5 per day" },
                    { value: "hourly", label: "Hourly" },
                ],
            },
            {
                key: "auto_reply",
                label: "Auto Reply",
                description: "Automatically reply to mentions and relevant conversations",
                setting_type: "toggle",
                default: "false",
            },
            {
                key: "auto_like",
                label: "Auto Like",
                description: "Automatically like tweets from your network and relevant content",
                setting_type: "toggle",
                default: "false",
            },
            {
                key: "content_topics",
                label: "Content Topics",
                description: "Topics to create content about (comma-separated, e.g. AI, startups, productivity)",
                setting_type: "text",
                default: "",
            },
            {
                key: "brand_voice",
                label: "Brand Voice",
                description: "Describe your unique voice (e.g. 'sarcastic founder who simplifies complex tech')",
                setting_type: "text",
                default: "",
            },
            {
                key: "thread_mode",
                label: "Thread Mode",
                description: "Include tweet threads (multi-tweet stories) in content mix",
                setting_type: "toggle",
                default: "true",
            },
            {
                key: "content_queue_size",
                label: "Content Queue Size",
                description: "Number of tweets to keep in the ready queue",
                setting_type: "select",
                default: "10",
                options: [
                    { value: "5", label: "5 tweets" },
                    { value: "10", label: "10 tweets" },
                    { value: "20", label: "20 tweets" },
                    { value: "50", label: "50 tweets" },
                ],
            },
            {
                key: "engagement_hours",
                label: "Engagement Hours",
                description: "When to check for mentions and engage",
                setting_type: "select",
                default: "business_hours",
                options: [
                    { value: "business_hours", label: "Business hours (9AM-6PM)" },
                    { value: "waking_hours", label: "Waking hours (7AM-11PM)" },
                    { value: "all_day", label: "All day (24/7)" },
                ],
            },
            {
                key: "approval_mode",
                label: "Approval Mode",
                description: "Write tweets to a queue file for your review instead of posting directly",
                setting_type: "toggle",
                default: "true",
            },
        ],
        agent: {
            name: "twitter-solo",
            description: "AI Twitter/X manager — creates content, manages posting schedule, handles engagement, and tracks performance",
            module: "builtin:chat",
            provider: "default",
            model: "default",
            max_tokens: 16384,
            temperature: 0.7,
            max_iterations: 50,
            system_prompt: `You are Twitter Solo — an autonomous Twitter/X content manager that creates, schedules, posts, and engages 24/7. Follow the phases: API Init → Schedule & Strategy → Content Research → Content Generation → Queue & Posting → Engagement → Performance Tracking → Persist State. Never post harmful content. In approval mode, always write to queue.`,
        },
        dashboard: {
            metrics: [
                { label: "Tweets Posted", memory_key: "twitter_solo_tweets_posted", format: "number" },
                { label: "Replies Sent", memory_key: "twitter_solo_replies_sent", format: "number" },
                { label: "Queue Size", memory_key: "twitter_solo_queue_size", format: "number" },
                { label: "Engagement Rate", memory_key: "twitter_solo_engagement_rate", format: "percentage" },
            ],
        },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // AutoResearch Solo
    // ═══════════════════════════════════════════════════════════════════════════
    autoresearch: {
        id: "autoresearch",
        name: "AutoResearch Solo",
        description:
            "Autonomous experimentation loop — iteratively improves any artifact through hypothesis → modify → evaluate → keep/discard cycles, inspired by Karpathy's autoresearch",
        category: "productivity",
        icon: "🔬",
        tools: [
            "shell_exec", "file_read", "file_write", "file_list",
            "web_fetch", "web_search", "memory_store", "memory_recall",
            "knowledge_add_entity", "knowledge_add_relation", "knowledge_query",
            "event_publish",
        ],
        settings: [
            {
                key: "target_artifact",
                label: "What to Optimize",
                description: "Description of the artifact being optimized (e.g. 'KDP book listing', 'YouTube video metadata', 'landing page copy', 'email sequence')",
                setting_type: "text",
                default: "",
            },
            {
                key: "optimization_goal",
                label: "Optimization Goal",
                description: "The metric or outcome to optimize for (e.g. 'maximize click-through rate', 'minimize bounce rate', 'maximize readability and engagement')",
                setting_type: "text",
                default: "",
            },
            {
                key: "current_version",
                label: "Current Version / Baseline",
                description: "Paste the current version of the artifact to use as the starting baseline. All improvements are measured against this.",
                setting_type: "text",
                default: "",
            },
            {
                key: "evaluation_method",
                label: "Evaluation Method",
                description: "How each iteration is scored against the optimization goal",
                setting_type: "select",
                default: "llm_judge",
                options: [
                    { value: "llm_judge", label: "LLM-as-Judge (AI evaluator scores each variant)" },
                    { value: "rubric", label: "Custom Rubric (define scoring criteria in the goal)" },
                    { value: "benchmark", label: "Automated Benchmark (for code/technical artifacts)" },
                    { value: "ab_proposals", label: "A/B Proposals (generate variants for manual testing)" },
                    { value: "comparative", label: "Comparative (head-to-head ranking of variants)" },
                ],
            },
            {
                key: "max_iterations",
                label: "Max Iterations",
                description: "Maximum number of modify→evaluate cycles to run",
                setting_type: "select",
                default: "25",
                options: [
                    { value: "5", label: "5 iterations (quick test)" },
                    { value: "10", label: "10 iterations (light)" },
                    { value: "25", label: "25 iterations (balanced)" },
                    { value: "50", label: "50 iterations (thorough)" },
                    { value: "100", label: "100 iterations (exhaustive)" },
                ],
            },
            {
                key: "mutation_strategy",
                label: "Mutation Strategy",
                description: "How aggressively to modify the artifact each iteration",
                setting_type: "select",
                default: "balanced",
                options: [
                    { value: "conservative", label: "Conservative (small tweaks, safer)" },
                    { value: "balanced", label: "Balanced (mix of small and large changes)" },
                    { value: "aggressive", label: "Aggressive (bold rewrites, higher variance)" },
                    { value: "diverse", label: "Diverse (alternate between strategies)" },
                ],
            },
            {
                key: "keep_experiment_log",
                label: "Save Experiment Log",
                description: "Save a detailed log of every iteration with scores, diffs, and reasoning",
                setting_type: "toggle",
                default: "true",
            },
            {
                key: "research_context",
                label: "Research Before Iterating",
                description: "Conduct web research on best practices before starting the optimization loop",
                setting_type: "toggle",
                default: "true",
            },
            {
                key: "output_top_n",
                label: "Top Variants to Report",
                description: "Number of best variants to include in the final report",
                setting_type: "select",
                default: "3",
                options: [
                    { value: "1", label: "Best only" },
                    { value: "3", label: "Top 3" },
                    { value: "5", label: "Top 5" },
                    { value: "10", label: "Top 10" },
                ],
            },
        ],
        agent: {
            name: "autoresearch-solo",
            description: "AI experimentation engine — iteratively optimizes any artifact through autonomous hypothesis → modify → evaluate → keep/discard cycles",
            module: "builtin:chat",
            provider: "default",
            model: "default",
            max_tokens: 16384,
            temperature: 0.6,
            max_iterations: 120,
            system_prompt: `You are AutoResearch Solo — an autonomous experimentation engine directly inspired by Karpathy's autoresearch (github.com/karpathy/autoresearch). You run an indefinite experiment loop on any artifact — modifying, evaluating, keeping or discarding — exactly like an autonomous ML researcher iterating on a training script overnight.

## Setup (first run)
1. Read the target artifact and optimization goal.
2. If "Research Before Iterating" is on, spend iteration 0 searching the web for best practices, competitor examples, and domain knowledge.
3. Establish the baseline: save the current version as version 0 and score it.
4. Initialize the experiment log (TSV format — see below).
5. Begin the loop.

## The Experiment Loop (LOOP FOREVER)

1. Review the current best version and the experiment log. What hasn't been tried? What patterns improved scores?
2. Form a hypothesis: a specific, testable idea about what change would improve the metric.
3. Modify the artifact. Make a targeted change — one variable at a time when possible.
4. Evaluate the new variant using the configured method. Score it numerically (0-100).
5. Compare:
   - If score IMPROVED: KEEP. This becomes the new best version.
   - If score is EQUAL or WORSE: DISCARD. Revert to the previous best version.
6. Log the result to the experiment log.
7. Go to step 1.

## Experiment Log Format

Maintain a TSV (tab-separated) experiment log as an artifact:

iteration | score | status | hypothesis | change_summary
0 | 62 | baseline | establish baseline | original version as provided
1 | 67 | keep | stronger opening hook improves engagement | rewritten first paragraph with question hook
2 | 65 | discard | shorter sentences improve readability | reduced avg sentence length by 40%
3 | 71 | keep | specific numbers increase credibility | added 3 concrete statistics

## Simplicity Criterion

All else being equal, simpler is better. A small improvement that adds ugly complexity is not worth keeping. Conversely, achieving equal results with a simpler approach is a win — that is a simplification improvement. Weigh the complexity cost against the improvement magnitude.

## Rules
- **NEVER STOP**. Once the loop has begun, do NOT pause to ask if you should continue. Run until max_iterations is reached. If you run out of ideas, think harder — re-read the goal, try combining previous near-misses, try more radical changes, look at the problem from a completely different angle.
- NEVER fabricate scores. If using LLM-as-Judge, reason through the evaluation step by step before assigning a number.
- Each iteration must try something DIFFERENT from previously discarded attempts.
- If an iteration crashes or produces garbage, log it as status "crash" and move on.
- The experiment log is as valuable as the final result — it maps the optimization landscape.
- In the final report, present the top N variants with scores and a summary of what worked vs. what did not.`,
        },
        dashboard: {
            metrics: [
                { label: "Experiments Run", memory_key: "autoresearch_solo_experiments_run", format: "number" },
                { label: "Best Score", memory_key: "autoresearch_solo_best_score", format: "text" },
                { label: "Improvement", memory_key: "autoresearch_solo_improvement_pct", format: "percentage" },
                { label: "Convergence", memory_key: "autoresearch_solo_converged", format: "text" },
            ],
        },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // Business Optimizer Solo
    // ═══════════════════════════════════════════════════════════════════════════
    business_optimizer: {
        id: "business_optimizer",
        name: "Business Optimizer Solo",
        description:
            "Continuous experimentation on business operations — generates, tests, and ranks process improvements across marketing, sales, support, and more",
        category: "data",
        icon: "📈",
        tools: [
            "shell_exec", "file_read", "file_write", "file_list",
            "web_fetch", "web_search", "memory_store", "memory_recall",
            "knowledge_add_entity", "knowledge_add_relation", "knowledge_query",
            "event_publish",
        ],
        settings: [
            {
                key: "optimization_domain",
                label: "Optimization Domain",
                description: "Which business area to optimize",
                setting_type: "select",
                default: "marketing",
                options: [
                    { value: "marketing", label: "Marketing (copy, campaigns, channels)" },
                    { value: "sales", label: "Sales (outreach, follow-ups, scripts)" },
                    { value: "support", label: "Customer Support (response templates, FAQ)" },
                    { value: "operations", label: "Operations (workflows, SOPs, processes)" },
                    { value: "pricing", label: "Pricing (price points, discounts, packaging)" },
                    { value: "content", label: "Content (blog, social, newsletters)" },
                    { value: "product", label: "Product (features, UX flows, onboarding)" },
                ],
            },
            {
                key: "current_approach",
                label: "Current Approach",
                description: "Describe your current process, template, or strategy that you want to improve",
                setting_type: "text",
                default: "",
            },
            {
                key: "success_metric",
                label: "Success Metric",
                description: "What to measure (e.g. 'conversion rate', 'response time', 'customer satisfaction', 'revenue per user')",
                setting_type: "text",
                default: "",
            },
            {
                key: "experiment_style",
                label: "Experiment Style",
                description: "How to run experiments",
                setting_type: "select",
                default: "generate_variants",
                options: [
                    { value: "generate_variants", label: "Generate Variants (create multiple alternatives)" },
                    { value: "llm_simulation", label: "LLM Simulation (simulate customer responses)" },
                    { value: "ab_proposals", label: "A/B Proposals (ready-to-deploy test pairs)" },
                    { value: "competitive_analysis", label: "Competitive Analysis (research + improve)" },
                ],
            },
            {
                key: "experiments_per_run",
                label: "Experiments Per Run",
                description: "Number of experiment variants to generate per run",
                setting_type: "select",
                default: "5",
                options: [
                    { value: "3", label: "3 experiments" },
                    { value: "5", label: "5 experiments" },
                    { value: "10", label: "10 experiments" },
                    { value: "20", label: "20 experiments" },
                ],
            },
            {
                key: "industry_context",
                label: "Industry Context",
                description: "Your industry for relevant benchmarks and best practices (e.g. 'B2B SaaS', 'e-commerce', 'healthcare')",
                setting_type: "text",
                default: "",
            },
            {
                key: "report_format",
                label: "Report Format",
                description: "How to present experiment results",
                setting_type: "select",
                default: "executive",
                options: [
                    { value: "executive", label: "Executive Summary (key findings + recommendations)" },
                    { value: "detailed", label: "Detailed (full experiment log + analysis)" },
                    { value: "data_table", label: "Data Table (ranked variants with scores)" },
                    { value: "action_items", label: "Action Items (prioritized list of changes)" },
                ],
            },
            {
                key: "safety_mode",
                label: "Safety Mode",
                description: "Require board approval before recommending deployment of any changes",
                setting_type: "toggle",
                default: "true",
            },
        ],
        agent: {
            name: "business-optimizer-solo",
            description: "AI operations optimizer — continuously experiments with business processes and ranks improvements by impact",
            module: "builtin:chat",
            provider: "default",
            model: "default",
            max_tokens: 16384,
            temperature: 0.5,
            max_iterations: 80,
            system_prompt: `You are Business Optimizer Solo — an autonomous experimentation engine for business operations, applying the autoresearch pattern to business processes. Like an autonomous researcher iterating on a training script, you iterate on business artifacts: copy, process, strategy, pricing.

## Setup
1. Deeply analyze: current approach, industry context, success metric, known constraints.
2. Research: web search for industry best practices, competitor approaches, case studies, and benchmarks.
3. Score the current approach as the baseline (0-100).
4. Initialize the experiment log (TSV format).

## The Experiment Loop (LOOP FOREVER)

1. Form a hypothesis: WHY would a specific change improve the success metric?
2. Design 1 variant that changes exactly ONE variable from the current best.
3. Evaluate: simulate realistic outcomes (customer responses, user behavior, market dynamics).
4. Score (0-100). Compare to current best.
5. KEEP if improved, DISCARD if not. Log the result.
6. Repeat until experiments_per_run reached.

## Experiment Log

iteration | score | status | hypothesis | variant_description | measurement_plan
0 | 55 | baseline | - | current approach | -
1 | 62 | keep | urgency increases conversion | added limited-time offer CTA | track CTA click rate over 7 days
2 | 58 | discard | shorter form reduces friction | reduced signup fields from 8 to 3 | track form completion rate

## Rules
- **NEVER STOP** until experiments_per_run is exhausted. Each experiment is fast — keep going.
- Every recommendation needs BOTH "what to change" AND "how to measure if it worked".
- In safety mode, present all recommendations as proposals, tagged "PENDING APPROVAL".
- When simulating customer responses, be realistic, not optimistic. Assume skepticism.
- Track experiment history across runs via memory to avoid re-testing failed ideas.
- Rank final recommendations by: expected impact x confidence x ease of implementation.`,
        },
        dashboard: {
            metrics: [
                { label: "Experiments Run", memory_key: "biz_optimizer_experiments_run", format: "number" },
                { label: "Improvements Found", memory_key: "biz_optimizer_improvements_found", format: "number" },
                { label: "Reports Generated", memory_key: "biz_optimizer_reports_generated", format: "number" },
                { label: "Est. Impact", memory_key: "biz_optimizer_estimated_impact", format: "text" },
            ],
        },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // Agent Evolver Solo
    // ═══════════════════════════════════════════════════════════════════════════
    agent_evolver: {
        id: "agent_evolver",
        name: "Agent Evolver Solo",
        description:
            "Evolves agent prompts, strategies, and tool-use patterns through historical task replay and iterative prompt optimization",
        category: "development",
        icon: "🧬",
        tools: [
            "shell_exec", "file_read", "file_write", "file_list",
            "web_fetch", "web_search", "memory_store", "memory_recall",
            "knowledge_add_entity", "knowledge_add_relation", "knowledge_query",
            "event_publish",
        ],
        settings: [
            {
                key: "target_agent_id",
                label: "Target Agent",
                description: "The agent ID or name to optimize (use 'self' to optimize yourself)",
                setting_type: "text",
                default: "",
            },
            {
                key: "evolution_target",
                label: "What to Evolve",
                description: "Which aspect of the agent to optimize",
                setting_type: "select",
                default: "system_prompt",
                options: [
                    { value: "system_prompt", label: "System Prompt (core instructions)" },
                    { value: "tool_strategy", label: "Tool Strategy (when & how to use tools)" },
                    { value: "approach_patterns", label: "Approach Patterns (problem-solving strategies)" },
                    { value: "memory_strategy", label: "Memory Strategy (what to persist & recall)" },
                    { value: "all", label: "All (comprehensive evolution)" },
                ],
            },
            {
                key: "replay_source",
                label: "Task Replay Source",
                description: "Which historical tasks to replay for evaluation",
                setting_type: "select",
                default: "recent",
                options: [
                    { value: "recent", label: "Recent Tasks (last 20 tasks)" },
                    { value: "failed", label: "Failed Tasks (focus on failures)" },
                    { value: "diverse", label: "Diverse Sample (mix of task types)" },
                    { value: "high_value", label: "High-Value Tasks (critical priorities)" },
                ],
            },
            {
                key: "evaluation_criteria",
                label: "Evaluation Criteria",
                description: "How to score evolved vs. original performance (e.g. 'task completion quality, speed, token efficiency')",
                setting_type: "text",
                default: "task completion quality, clarity of output, efficiency",
            },
            {
                key: "max_generations",
                label: "Max Generations",
                description: "Number of evolution generations to run",
                setting_type: "select",
                default: "10",
                options: [
                    { value: "3", label: "3 generations (quick)" },
                    { value: "5", label: "5 generations (light)" },
                    { value: "10", label: "10 generations (balanced)" },
                    { value: "25", label: "25 generations (thorough)" },
                ],
            },
            {
                key: "mutation_strength",
                label: "Mutation Strength",
                description: "How aggressively to modify the agent between generations",
                setting_type: "select",
                default: "moderate",
                options: [
                    { value: "conservative", label: "Conservative (small refinements)" },
                    { value: "moderate", label: "Moderate (meaningful changes)" },
                    { value: "aggressive", label: "Aggressive (major restructuring)" },
                ],
            },
            {
                key: "auto_apply",
                label: "Auto-Apply Improvements",
                description: "Automatically apply the best evolved version to the target agent (off = propose only)",
                setting_type: "toggle",
                default: "false",
            },
            {
                key: "track_lineage",
                label: "Track Lineage",
                description: "Save the full evolutionary tree showing which mutations led to improvements",
                setting_type: "toggle",
                default: "true",
            },
        ],
        agent: {
            name: "agent-evolver-solo",
            description: "AI evolution engine — iteratively improves agent prompts and strategies through historical task replay and scored mutations",
            module: "builtin:chat",
            provider: "default",
            model: "default",
            max_tokens: 16384,
            temperature: 0.5,
            max_iterations: 100,
            system_prompt: `You are Agent Evolver Solo — an autonomous evolution engine that improves other agents through iterative prompt optimization, applying the autoresearch experiment loop to agent configurations. Like autoresearch iterating on train.py, you iterate on agent system prompts and strategies.

## Setup
1. Read the target agent's current config: system prompt, tools, approach patterns, known skills.
2. Collect historical task data: what tasks were assigned, what the agent produced, what succeeded or failed.
3. Score the baseline configuration against evaluation criteria.
4. Initialize the evolution log (TSV format).

## The Evolution Loop (LOOP FOREVER)

1. Analyze: which types of tasks does the agent struggle with? Where does the prompt lack coverage?
2. Hypothesize: form a specific mutation that would improve performance on observed weaknesses.
3. Mutate: modify the agent's system prompt / tool guidance / approach patterns.
4. Replay: simulate how the mutated agent would handle 3-5 historical tasks. Would it produce better output?
5. Score the mutated version (0-100) against baseline using evaluation criteria.
6. KEEP if improved, DISCARD if not. The current best becomes the new baseline.
7. Log the generation with mutation details and scores.
8. Repeat until max_generations.

## Evolution Log

generation | score | status | mutation_type | change_summary
0 | 65 | baseline | - | current configuration
1 | 70 | keep | prompt_clarity | added explicit step-by-step for multi-file tasks
2 | 68 | discard | tool_strategy | restricted shell_exec to verification only
3 | 74 | keep | edge_cases | added error recovery instructions for API failures

## Mutation Types
- **Prompt Clarity**: make ambiguous instructions precise and specific.
- **Edge Case Coverage**: add handling for failure modes seen in historical tasks.
- **Tool Strategy**: refine when/how tools are used (reduce waste, improve selection).
- **Approach Patterns**: add domain-specific step-by-step workflows.
- **Simplification**: remove redundant instructions (equal quality with less complexity = win).

## Rules
- **NEVER STOP** until max_generations. If stuck, try combining near-miss mutations or try the opposite of what failed.
- NEVER degrade safety constraints, ethical guidelines, or permission checks during evolution.
- NEVER fabricate replay results. Reason honestly about how the mutated agent would perform.
- The evolution lineage is a valuable artifact — it reveals which mutation types work best for this agent.
- If auto_apply is off, present the final evolved configuration as a proposal with full before/after diff.`,
        },
        dashboard: {
            metrics: [
                { label: "Generations Run", memory_key: "agent_evolver_generations_run", format: "number" },
                { label: "Score Improvement", memory_key: "agent_evolver_score_improvement", format: "percentage" },
                { label: "Agents Evolved", memory_key: "agent_evolver_agents_evolved", format: "number" },
                { label: "Mutations Applied", memory_key: "agent_evolver_mutations_applied", format: "number" },
            ],
        },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // System Meta Solo
    // ═══════════════════════════════════════════════════════════════════════════
    system_meta: {
        id: "system_meta",
        name: "System Meta Solo",
        description:
            "Meta-level self-improvement — optimizes Paperclip's own prompts, skills, solo definitions, and configurations through automated benchmarking",
        category: "development",
        icon: "🧠",
        tools: [
            "shell_exec", "file_read", "file_write", "file_list",
            "web_fetch", "web_search", "memory_store", "memory_recall",
            "knowledge_add_entity", "knowledge_add_relation", "knowledge_query",
            "event_publish",
        ],
        settings: [
            {
                key: "improvement_target",
                label: "What to Improve",
                description: "Which part of the system to optimize",
                setting_type: "select",
                default: "agent_prompts",
                options: [
                    { value: "agent_prompts", label: "Agent System Prompts" },
                    { value: "solo_definitions", label: "Solo Definitions (instructions & prompts)" },
                    { value: "skill_files", label: "Skill Files (SKILL.md)" },
                    { value: "adapter_configs", label: "Adapter Configurations" },
                    { value: "onboarding", label: "Onboarding Flow (new agent setup)" },
                ],
            },
            {
                key: "test_scenarios",
                label: "Test Scenarios",
                description: "Describe scenarios to evaluate against (e.g. 'Agent should correctly handle multi-step tasks, recover from errors, and produce structured output')",
                setting_type: "text",
                default: "",
            },
            {
                key: "scoring_method",
                label: "Scoring Method",
                description: "How to score each improvement iteration",
                setting_type: "select",
                default: "llm_judge",
                options: [
                    { value: "llm_judge", label: "LLM-as-Judge (AI evaluator)" },
                    { value: "task_completion", label: "Task Completion Rate (simulated)" },
                    { value: "rubric", label: "Custom Rubric (define in test scenarios)" },
                    { value: "comparative", label: "Comparative (head-to-head A/B)" },
                ],
            },
            {
                key: "iterations_per_run",
                label: "Iterations Per Run",
                description: "Number of improvement iterations to attempt",
                setting_type: "select",
                default: "10",
                options: [
                    { value: "5", label: "5 iterations (quick audit)" },
                    { value: "10", label: "10 iterations (balanced)" },
                    { value: "25", label: "25 iterations (thorough)" },
                    { value: "50", label: "50 iterations (deep optimization)" },
                ],
            },
            {
                key: "staging_mode",
                label: "Staging Mode",
                description: "Dry-run mode — propose changes without applying them. Always review before deploying to production.",
                setting_type: "toggle",
                default: "true",
            },
            {
                key: "approval_required",
                label: "Require Board Approval",
                description: "All proposed improvements must be approved by board before being applied",
                setting_type: "toggle",
                default: "true",
            },
            {
                key: "scope_limit",
                label: "Scope Limit",
                description: "How much of the system to modify per iteration",
                setting_type: "select",
                default: "single",
                options: [
                    { value: "single", label: "Single Component (safest)" },
                    { value: "related", label: "Related Components (e.g. prompt + skill)" },
                    { value: "cross_cutting", label: "Cross-Cutting (multiple layers)" },
                ],
            },
        ],
        agent: {
            name: "system-meta-solo",
            description: "AI meta-optimizer — improves Paperclip itself by iteratively optimizing system prompts, skills, and configurations through automated evaluation",
            module: "builtin:chat",
            provider: "default",
            model: "default",
            max_tokens: 16384,
            temperature: 0.4,
            max_iterations: 100,
            system_prompt: `You are System Meta Solo — the meta-level optimization engine for Paperclip. Like autoresearch treats train.py as the single modifiable file, you treat Paperclip's own prompts, skills, and configurations as the "code" to optimize through the experiment loop.

## Setup
1. Read the improvement target. Understand its purpose, how agents consume it, and known pain points.
2. Read test scenarios. If none provided, derive them from the target's documented purpose.
3. Score the current configuration as baseline (0-100).
4. Research: web search for best practices in prompt engineering, agent system design, and AI orchestration.
5. Initialize the experiment log.

## The Meta-Research Loop (LOOP FOREVER)

1. Identify the weakest aspect of the current best configuration.
2. Form a hypothesis about a specific improvement.
3. Make one targeted modification. Keep the change scoped — one variable at a time.
4. Evaluate against the test scenarios. Score (0-100).
5. KEEP if score improved, DISCARD if not.
6. Log the iteration.
7. Repeat until iterations_per_run exhausted.

## Experiment Log

iteration | score | status | target_aspect | change_summary | rollback_plan
0 | 58 | baseline | - | current configuration | -
1 | 63 | keep | clarity | rewrote ambiguous tool-selection paragraph | revert to lines 34-42 of original
2 | 61 | discard | error_handling | added 15-line error recovery block | remove added block
3 | 67 | keep | simplification | removed redundant examples, kept one clear one | restore examples from v0

## Simplicity Criterion
Same rule as autoresearch: a small improvement that adds ugly complexity is NOT worth it. An equal result with simpler code/prompts? Definitely keep. Removing unnecessary instructions while maintaining quality is a win.

## SAFETY CONSTRAINTS (MANDATORY — NEVER VIOLATE)
- NEVER remove safety guardrails, ethical guidelines, or permission checks.
- NEVER modify authentication, authorization, or budget enforcement logic.
- In staging mode, write ALL proposals as artifacts — do NOT modify actual system files.
- If approval_required is on, tag every change as "PENDING BOARD APPROVAL".
- Always maintain backward compatibility.
- Every change must include a rollback plan in the experiment log.
- **NEVER STOP** until iterations exhausted. If stuck, try radical simplification or research AI agent design papers for new angles.`,
        },
        dashboard: {
            metrics: [
                { label: "Iterations Run", memory_key: "system_meta_iterations_run", format: "number" },
                { label: "Score Improvement", memory_key: "system_meta_score_improvement", format: "percentage" },
                { label: "Proposals Generated", memory_key: "system_meta_proposals_generated", format: "number" },
                { label: "Proposals Applied", memory_key: "system_meta_proposals_applied", format: "number" },
            ],
        },
    },

    experiment_manager: {
        id: "experiment_manager",
        name: "Experiment Manager Solo",
        description:
            "Autonomous self-improvement manager for Paperclip — creates replay campaigns, runs evaluations, requests approvals, activates approved policy rollouts, and advances safe branch experiments end-to-end",
        category: "development",
        icon: "🧪",
        tools: ["shell_exec", "file_read", "file_write", "web_fetch", "memory_store", "memory_recall"],
        settings: [
            {
                key: "optimization_objective",
                label: "Optimization Objective",
                description: "What this manager should improve first (e.g. throughput, quality, cost, or a specific team workflow)",
                setting_type: "text",
                default: "Improve recurring workflows using replay-first evaluation and approval-gated promotion.",
            },
            {
                key: "primary_scope",
                label: "Primary Scope",
                description: "Where to focus first",
                setting_type: "select",
                default: "solo_instance",
                options: [
                    { value: "solo_instance", label: "Solo instances" },
                    { value: "issue_schedule", label: "Scheduled issues" },
                    { value: "project", label: "Projects / workspaces" },
                    { value: "company", label: "Company policy" },
                ],
            },
            {
                key: "autonomy_mode",
                label: "Autonomy Mode",
                description: "How aggressively the manager should advance experiments",
                setting_type: "select",
                default: "max_safe_autonomy",
                options: [
                    { value: "suggest_only", label: "Suggest only" },
                    { value: "approval_gated", label: "Approval-gated" },
                    { value: "max_safe_autonomy", label: "Max safe autonomy" },
                ],
            },
        ],
        agent: {
            name: "experiment-manager-solo",
            description: "Runs the full Paperclip experimentation loop across replay, routing, policy rollouts, and branch lab promotion with governance safeguards.",
            module: "builtin:chat",
            provider: "default",
            model: "default",
            max_tokens: 16384,
            temperature: 0.2,
            max_iterations: 40,
            system_prompt: `You are Experiment Manager Solo — the autonomous orchestrator for Paperclip's experimentation platform.

Your job is to continuously improve the system using the safe rollout ladder:
1. Create or refine shadow replay campaigns.
2. Add baseline and challenger variants.
3. Create evaluation suites and execute replay runs.
4. If evidence is strong, request promotion approvals for winning variants.
5. Request policy rollouts where operating policy changes are justified.
6. In max_safe_autonomy mode, activate already-approved policy rollouts.
7. For code-change experiments, create branch lab plans, track validators, request promotion approvals, and in max_safe_autonomy mode mark already-approved branch promotions as promoted.

Use the Paperclip experimentation API under /api for all state changes. Prefer replay-first evaluation before live routing. Never bypass board approvals when they are required. If an approval is pending, leave a clear issue comment or artifact and wait. Keep campaigns small, company-scoped, and reversible. When running in max_safe_autonomy mode, you may only advance changes that are already approved or that require no approval by policy.

When you wake because of an approval result, check whether it corresponds to a variant promotion, policy rollout, or branch experiment promotion and advance the approved item immediately if it is safe to do so.

Always maintain an audit trail: summarize what changed, why it was chosen, what safety rails apply, and how to roll it back.`,
        },
        dashboard: {
            metrics: [
                { label: "Campaigns Managed", memory_key: "experiment_manager_campaigns_managed", format: "number" },
                { label: "Approved Promotions", memory_key: "experiment_manager_approved_promotions", format: "number" },
                { label: "Active Rollouts", memory_key: "experiment_manager_active_rollouts", format: "number" },
                { label: "Branch Experiments", memory_key: "experiment_manager_branch_experiments", format: "number" },
            ],
        },
    },
};

export function listSoloDefinitions(): SoloDefinition[] {
    return Object.values(BUNDLED_SOLOS);
}

export function getSoloDefinition(id: string): SoloDefinition | undefined {
    return BUNDLED_SOLOS[id];
}
