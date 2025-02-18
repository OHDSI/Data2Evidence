import { Bot, OperationOutcome } from '@medplum/fhirtypes'
import { config as botConfig } from './bots.config.ts'
import { FhirAPI } from "./api/FhirServerAPI.ts";
import { basename } from "path";
import { readFileSync } from "fs";
import { ContentType } from "@medplum/core";
import { env } from './env.ts';

interface MedplumBotConfig {
    readonly name: string;
    readonly id: string;
    readonly description: string;
    readonly source: string;
    readonly dist: string;
    readonly subscriptionCriteria?: string;
}

//Reads bots.config.json file and creates, deploys the bots and creates subcription for 'Super Admin' project
export async function readAndCreateBotFromConfig():Promise<void> {
    const botConfigs = botConfig.bots;
    try{
        if (!botConfigs) {
            console.log('0 bots configured in bot config.')
            return ;
        }
        console.log(botConfig.bots.length + ' bots configured in bot config.')
        let fhirApi = new FhirAPI()
        await fhirApi.clientCredentialslogin()
        await enableBotForSuperAdminProject(fhirApi)
        for (const botConfig of botConfigs) {
            await createBot(fhirApi, 'Project Id', botConfig, 'vmcontext');
            console.log(`Bot ${botConfig.name} saved and deployed successfully!`)
        }
        console.log('All bots are saved and deployed successfully!')
    } catch (err: unknown) {
        console.log(JSON.stringify(err))
        console.log(`Failed to save bots`)
    }
}

async function createBot(
    fhirApi: FhirAPI,
    projectId: string,
    botConfig: MedplumBotConfig,
    runtimeVersion: string,
  ): Promise<void> {
    const body = {
      name: botConfig.name,
      description: botConfig.description,
      runtimeVersion:runtimeVersion
    };
    try{
        //Check if the bot exists
        console.log(`Check if bot ${botConfig.name} already exists in DB`)
        let bot:Bot
        let searchResult = await fhirApi.searchResource_bot('name='+botConfig.name);
        if(searchResult){
            bot = searchResult; 
        }else{
            console.log(`Create new bot ${botConfig.name}`)     
            let newBot = await fhirApi.post('admin/projects/' + projectId + '/bot', body)
            bot = await fhirApi.readResource_bot(newBot.id);
        }
        let saveBotResult = await saveBot(fhirApi, botConfig as MedplumBotConfig, bot);
        if(saveBotResult){
            let deployBotResult = await deployBot(fhirApi, botConfig as MedplumBotConfig, bot);
            if(deployBotResult)
                await createSubscription(fhirApi, botConfig as MedplumBotConfig, bot)
            else
                console.log(`Failed to deploy bot: ${botConfig.name}`)
        }else
            console.log(`Failed to save bot: ${botConfig.name}`)
        console.log(`Success! Bot created: ${bot.id}`);
    }catch(err){
        console.log('Failed to create bot: ' + botConfig.name);
        throw err;
    }
}

async function saveBot(fhirApi: FhirAPI, botConfig: MedplumBotConfig, bot: Bot): Promise<boolean> {
    try{
        const codePath = botConfig.source;
        const code = readFileContents(codePath);
        if (!code) {
          return false;
        }
        console.log('Saving source code...');
        const sourceCode = await fhirApi.createAttachment_bot(basename(codePath), code, ContentType.JAVASCRIPT);
      
        console.log('Updating bot...');
        const updateResult = await fhirApi.updateResource_bot(bot, sourceCode);
        console.log('Success! New bot version: ' + updateResult.meta?.versionId);
        return true
    }catch(err){
        console.log('Failed to save bot: ' + botConfig.name);
        throw err;
    }
}

async function deployBot(fhirApi: FhirAPI, botConfig: MedplumBotConfig, bot: Bot): Promise<boolean> {
    const codePath = botConfig.dist;
    try{
        const code = readFileContents(codePath);
        if (!code) return false;
        console.log('Deploying bot...');
        console.log(fhirApi.fhirUrl_bot('$deploy', bot.id).toString())
        const deployResult = (await fhirApi.post(
            fhirApi.fhirUrl_bot('$deploy', bot.id).toString(), 
            {
                code,
                filename: basename(codePath)
            }
        )) as OperationOutcome;
        console.log('Deploy result: ' + deployResult.issue?.[0]?.details?.text);
        return true
    }catch(err){
        console.log(JSON.stringify(err))
        console.log('Failed to deploy bot: ' + botConfig.name);
        throw err;
    }
}

async function createSubscription(fhirApi: FhirAPI, botConfig: MedplumBotConfig, bot: Bot){
    const result = await fhirApi.searchResource_subscription(`criteria=${botConfig.subscriptionCriteria}`)
    const botSubscription = result.entry?.filter((x) => x.resource?.channel.endpoint == 'Bot/' + bot.id)
    if (botSubscription?.length == 0) {
        // Create new subscription
        await fhirApi.createResource_subscription(
            `Bot/${bot.id}`, 
            `Rest hook subscription for ${botConfig.subscriptionCriteria} resource`, 
            botConfig.subscriptionCriteria);
        console.log(`Subscription for bot: ${bot.name} successfully created!`)
    }
    return 
}

// export async function createSubscription(){
//     console.log('Create rest-hook subscription for Super Admin')
//     const botConfigs = botConfig.bots;
//     let fhirApi = new FhirAPI()
//     await fhirApi.clientCredentialslogin()
//     for (const botConfig of botConfigs) {
//         const result = await fhirApi.searchResource_subscription(`criteria=${botConfig.subscriptionCriteria}`)
//         if(result.entry.length == 0){
//             console.log(`Create new subscription for ${botConfig.subscriptionCriteria}`)
//             await fhirApi.createResource_subscription(
//                 `${env.SERVICE_ROUTES.fhirSvc}/ingestResource/${botConfig.subscriptionCriteria}`,
//                 `Rest hook subscription for ${botConfig.subscriptionCriteria} resource`,
//                 botConfig.subscriptionCriteria);
//             console.log(`Subscription for ${botConfig.subscriptionCriteria} successfully created!`)
//         }
//     }
//     return
// }

function readFileContents(filePath: string): string {
    // const path = resolve(fileName);
    // console.log(path)
    // if (!existsSync(path)) {
    //     return '';
    // }
    console.log(`Plugins path: ${env.PLUGIN_PATH + '/' + filePath}`)
    return readFileSync(env.PLUGIN_PATH + '/' + filePath, 'utf8');
}

async function enableBotForSuperAdminProject(fhirApi: FhirAPI){
    let searchResult = await fhirApi.getResource('name=Super Admin')
    let superAdminProject:Project
    if(searchResult){
        superAdminProject = searchResult
    }else
        throw 'Super Admin project not found!'
    superAdminProject.features = ['bots']
    return await fhirApi.updateResource(superAdminProject)
}