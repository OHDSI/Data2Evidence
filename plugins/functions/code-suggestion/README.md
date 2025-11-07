### Set API_KEY environment variables
To use code-suggestion, the API_KEY for specific AI models should be provided in .env or .env.local file.
##### If use model directly from model providers, set below API_KEY
- OPENAI_API_KEY=xxx
- ANTHROPIC_API_KEY=xxx

##### If use Azure OpenAI, set below variables, values can be extracted from "Endpoint" of the deployment.
- AZURE_OPENAI_API_KEY='yyy'
- AZURE_OPENAI_API_VERSION="xxx"
- AZURE_OPENAI_API_INSTANCE_NAME=<resource_name_of_your_deployment>
- AZURE_OPENAI_API_DEPLOYMENT_NAME=<YOUR_DEPLOYMENT_NAME>

### Set AI_MODEL environment variable
The name of specific model is provided as well
- For calling model directly from AI model provider, use the model name, e.g. 'gpt-4o'
- For calling model from Azure OpenAI, set the AI_MODEL='azure:gpt-4o'
- For calling model from local, set the AI_MODEL='local'