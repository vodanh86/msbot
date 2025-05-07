import { BotDeclaration, PreventIframe } from "express-msteams-host";
import * as debug from "debug";
import { CardFactory, ConversationState, MemoryStorage, UserState, TurnContext } from "botbuilder";
import { DialogBot } from "./dialogBot";
import { MainDialog } from "./dialogs/mainDialog";
import WelcomeCard from "./cards/welcomeCard";
import { app } from "@microsoft/teams-js";
import {VaultClient} from "node-vault-client";

// Initialize debug logging module
const log = debug("msteams");
const VaultClient = require('node-vault-client');

var appId = process.env.MICROSOFT_APP_ID || "";
var appPassword = process.env.MICROSOFT_APP_PASSWORD || "";

const vaultClient = VaultClient.boot('main', {
    api: { url: process.env.VAULT_URL },
    auth: {
        type: 'token',
        config: { token: process.env.VAULT_TOKEN }
    },
});

async function initializeCredentials() {
    try {
        const vaultData = await vaultClient.read('ai-platform/data/bot');
        appId = vaultData.__data.data.app_id;
        appPassword = vaultData.__data.data.app_password;
        console.log('Vault Data:', vaultData);
    } catch (error) {
        console.error('Failed to load credentials from Vault:', error);
    }
}

// Gọi hàm khởi tạo để lấy thông tin từ Vault
(async () => {
    await initializeCredentials();
})();

/**
 * Implementation for AbHr Bot
 */
  @BotDeclaration(
      "/api/messages",
      new MemoryStorage(),
      // eslint-disable-next-line no-undef
      appId,
      // eslint-disable-next-line no-undef
      appPassword)
@PreventIframe("/abHrBot/aboutAbHrBot.html")
export class AbHrBot extends DialogBot {
    constructor(conversationState: ConversationState, userState: UserState) {
        super(conversationState, userState, new MainDialog());

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            if (membersAdded && membersAdded.length > 0) {
                for (let cnt = 0; cnt < membersAdded.length; cnt++) {
                    if (membersAdded[cnt].id !== context.activity.recipient.id) {
                        await this.sendWelcomeCard( context );
                    }
                }
            }
            await next();
        });
    }

    public async sendWelcomeCard( context: TurnContext ): Promise<void> {
        const welcomeCard = CardFactory.adaptiveCard(WelcomeCard);
        await context.sendActivity({ attachments: [welcomeCard] });
    }

}
