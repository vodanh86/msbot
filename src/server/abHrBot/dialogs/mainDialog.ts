import {
    ComponentDialog,
    DialogSet,
    DialogState,
    DialogTurnResult,
    DialogTurnStatus,
    TextPrompt,
    WaterfallDialog,
    WaterfallStepContext
} from "botbuilder-dialogs";
import {
    MessageFactory,
    StatePropertyAccessor,
    InputHints,
    TurnContext
} from "botbuilder";
import { TeamsInfoDialog } from "./teamsInfoDialog";
import { HelpDialog } from "./helpDialog";
import { MentionUserDialog } from "./mentionUserDialog";

const MAIN_DIALOG_ID = "mainDialog";
const MAIN_WATERFALL_DIALOG_ID = "mainWaterfallDialog";

export class MainDialog extends ComponentDialog {
    public onboarding: boolean;
    constructor() {
        super(MAIN_DIALOG_ID);
        this.addDialog(new TextPrompt("TextPrompt"))
            .addDialog(new TeamsInfoDialog())
            .addDialog(new HelpDialog())
            .addDialog(new MentionUserDialog())
            .addDialog(new WaterfallDialog(MAIN_WATERFALL_DIALOG_ID, [
                this.introStep.bind(this),
                this.actStep.bind(this)
            ]));
        this.initialDialogId = MAIN_WATERFALL_DIALOG_ID;
        this.onboarding = false;
    }

    public async run(context: TurnContext, accessor: StatePropertyAccessor<DialogState>) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);
        const dialogContext = await dialogSet.createContext(context);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    private async introStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        console.log("Service URL:", stepContext.context.activity.serviceUrl);

        if ((stepContext.options as any).restartMsg) {
            const messageText = (stepContext.options as any).restartMsg ? (stepContext.options as any).restartMsg : "What can I help you with today?";
            const promptMessage = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt("TextPrompt", { prompt: promptMessage });
        } else {
            this.onboarding = true;
            return await stepContext.next();
        }
    }

    private async actStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        if (stepContext.result) {
            /*
            ** This is where you would add LUIS to your bot, see this link for more information:
            ** https://docs.microsoft.com/en-us/azure/bot-service/bot-builder-howto-v4-luis?view=azure-bot-service-4.0&tabs=javascript
            */
            const result = stepContext.result.trim().toLocaleLowerCase();
            switch (result) {
                case "who":
                case "who am i?": {
                    return await stepContext.beginDialog("teamsInfoDialog");
                }
                case "get help":
                case "help": {
                    return await stepContext.beginDialog("helpDialog");
                }
                case "mention me":
                case "mention": {
                    return await stepContext.beginDialog("mentionUserDialog");
                }
                default: {
                    await stepContext.context.sendActivity("Ok, maybe next time 😉");
                    return await stepContext.next();
                }
            }
        } else if (this.onboarding) {
            // Gửi sự kiện "typing" trong khi chờ phản hồi từ API
            await stepContext.context.sendActivity({ type: "typing" });

            const body = {
                question: stepContext.context.activity.text,
                model: "gpt-4o",
                session_id: stepContext.context.activity.from.id,
                name: stepContext.context.activity.from.name
            };

            try {
                const response = await fetch(process.env.LANGCHAIN_API_URL + "/chat", {
                    method: "POST",
                    headers: {
                        accept: "application/json",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body)
                });
                const data = await response.json();
                await stepContext.context.sendActivity(data.answer);
            } catch (error) {
                console.error("Error:", error);
                await stepContext.context.sendActivity("Sorry, I couldn't process your request at the moment.");
            }

            return await stepContext.next();
            /* switch (stepContext.context.activity.text) {
                case "who": {
                    return await stepContext.beginDialog("teamsInfoDialog");
                }
                case "help": {
                    return await stepContext.beginDialog("helpDialog");
                }
                case "mention": {
                    return await stepContext.beginDialog("mentionUserDialog");
                }
                default: {
                    await stepContext.context.sendActivity("Ok, maybe next time 😉");
                    return await stepContext.next();
                }
            } */ // Thêm khoảng trắng trước */
        }
        return await stepContext.next();
    }

    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        return await stepContext.replaceDialog(this.initialDialogId, { restartMsg: "What else can I do for you?" });
    }
}
