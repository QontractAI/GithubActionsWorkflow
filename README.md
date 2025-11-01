## i18n Copilot – Auto-translate JSON-based localization files

Keep your localization files perfectly in sync — automatically.

This GitHub Action monitors your base language JSON file and, whenever a change is committed, triggers an API call to update all other language files in your repository. No more manual syncing, copy-pasting, or missed translations. Once translations are completed, it creates a pull request to the specified branch with all performed changes.

Ideal for projects using JSON-based i18n (React, Next.js, Vue, Nuxt, Svelte, Angular, etc.).

## How to use it
1. Qontract account
    * If you don't have one, go to [QontractAI](https://qontract.org/register).
    * Select your plan (**Free plan available**).
2. Qontract access token
    * To create a new access token, go to your [QontractAI Profile](https://qontract.org/profile), scroll down, and click "Create Access Token".
3. GitHub access token
    * Follow [these instructions](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) to create a GitHub access token.
    * Required token permissions
      * **Contents**: Read and write
      * **Pull requests**: Read and write
4. Add qconfig.json file to your repository
    * Store it in your base branch (e.g., main)
    * Required content:
      ```json
      {
        "on_push_to": [
          "main"
        ],
        "base_file": "src/assets/i18n/en.json",
        "translate_to": {
          "pl": "src/assets/i18n/pl.json",
          "ru": "src/assets/i18n/ru.json",
          "es": "src/assets/i18n/es.json",
          "fr": "src/assets/i18n/fr.json",
          "de": "src/assets/i18n/de.json",
          "it": "src/assets/i18n/it.json",
          "ja": "src/assets/i18n/ja.json",
          "fi": "src/assets/i18n/fi.json",
          "uk": "src/assets/i18n/uk.json"
        }
      }
       ```
      * on_push_to: Array of branch names to track. Specify the same branch you enter in inputs.
      * base_file: Path to your base translation file (the file that contains the source translations).
      * translate_to: Object mapping language codes to their file paths. Keys are Qontract language codes; values are absolute paths in your repository. To see all supported language keys, visit [QontractAI language codes](https://qontract.org/integrations/github).
5. Add our action to your workflow
```yaml
name: i18n Copilot
on:
  push:
    branches: [ main ]
    # Optional but recommended to limit runs to relevant files
    paths:
      - src/assets/i18n/en.json

jobs:
  translate:
    runs-on: ubuntu-latest

    steps:
      - name: Run i18n Copilot
        uses: owner/repo@v1
        with:
          github_access_token: ${{ secrets.GITHUB_TOKEN }}
          qontract_access_token: ${{ secrets.QONTRACT_ACCESS_TOKEN }}
          base_branch: main
          base_language_key: en
```

## Security considerations
- This action forwards your `github_access_token` and `qontract_access_token` to the Qontract API (`https://api.qontract.org/integrations/github-actions/webhook`) to perform translations on your behalf.
- If you prefer not to forward the ephemeral `GITHUB_TOKEN`, use a fine‑grained GitHub personal access token with only the minimum read and write permissions required.
- Store all tokens in GitHub Actions **secrets** and never hard‑code them.


## Troubleshooting
- "Invalid base language key": Ensure `base_language_key` is a valid ISO‑639‑1 code supported by the action.
- "Failed to get base file from config file": Ensure `qconfig.json` exists on `base_branch` and has a `base_file` key.
- "No modified files or base file not modified": The action only runs when the base file listed in `qconfig.json` changed in the triggering commit.

