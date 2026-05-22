'use strict';

// Display metadata for built-in patterns (mirrors the regexes in lib/hook.sh)
module.exports = [
  {
    label:       'Private Key',
    description: 'SSH / TLS private keys',
    example:     '-----BEGIN RSA PRIVATE KEY-----',
    type:        'exact',
  },
  {
    label:       'AWS Access Key',
    description: 'AWS IAM access key IDs',
    example:     'AKIA4EXAMPLE...',
    type:        'exact',
  },
  {
    label:       'AWS Secret Key',
    description: 'AWS secret access key assignments',
    example:     'aws_secret_key = "wJalrXUt..."',
    type:        'icase',
  },
  {
    label:       'Anthropic Key',
    description: 'Claude / Anthropic API keys',
    example:     'sk-ant-api03-...',
    type:        'exact',
  },
  {
    label:       'OpenAI Key',
    description: 'OpenAI API keys',
    example:     'sk-proj-...',
    type:        'exact',
  },
  {
    label:       'Google API Key',
    description: 'Google Cloud / Firebase API keys',
    example:     'AIzaSyC...',
    type:        'exact',
  },
  {
    label:       'GitHub Token',
    description: 'GitHub personal / OAuth / Actions tokens',
    example:     'ghp_16C7e42F..., ghs_...',
    type:        'exact',
  },
  {
    label:       'Slack Token',
    description: 'Slack Bot / App / User tokens',
    example:     'xoxb-..., xoxa-...',
    type:        'exact',
  },
  {
    label:       'JWT Token',
    description: 'JSON Web Tokens (3-part dot-separated)',
    example:     'eyJhbGci....eyJzdWI....',
    type:        'exact',
  },
  {
    label:       'Generic API Key',
    description: 'Any api_key / apikey / api-key assignment',
    example:     'api_key = "abc123..."',
    type:        'icase',
  },
  {
    label:       'Generic Token',
    description: 'access_token, auth_token, bearer_token assignments',
    example:     'access_token = "xyz789..."',
    type:        'icase',
  },
  {
    label:       'Password',
    description: 'password / passwd / pwd assignments',
    example:     'password = "s3cr3t!"',
    type:        'icase',
  },
  {
    label:       'Secret',
    description: 'client_secret / app_secret assignments',
    example:     'client_secret = "abc..."',
    type:        'icase',
  },
  {
    label:       'Connection String',
    description: 'Database URLs with embedded credentials',
    example:     'mongodb://user:pass@host/db',
    type:        'icase',
  },
];
