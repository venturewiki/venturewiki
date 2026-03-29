const { GoogleAuth } = require('google-auth-library')
const https = require('https')

const PROJECT = 'venturewiki-e05cc'
const DATABASE = '(default)'
const KEY_FILE = './.playwright-mcp/venturewiki-e05cc-firebase-adminsdk-fbsvc-aa891b593b.json'

const INDEXES = [
  {
    collection: 'businesses',
    fields: [
      { fieldPath: 'isArchived', order: 'ASCENDING' },
      { fieldPath: 'updatedAt',  order: 'DESCENDING' },
    ]
  },
  {
    collection: 'businesses',
    fields: [
      { fieldPath: 'isArchived',  order: 'ASCENDING' },
      { fieldPath: 'isFeatured',  order: 'ASCENDING' },
      { fieldPath: 'updatedAt',   order: 'DESCENDING' },
    ]
  },
  {
    collection: 'businesses',
    fields: [
      { fieldPath: 'isArchived',  order: 'ASCENDING' },
      { fieldPath: 'cover.stage', order: 'ASCENDING' },
      { fieldPath: 'updatedAt',   order: 'DESCENDING' },
    ]
  },
  {
    collection: 'businesses',
    fields: [
      { fieldPath: 'slug',       order: 'ASCENDING' },
      { fieldPath: 'isArchived', order: 'ASCENDING' },
    ]
  },
  {
    collection: 'edits',
    fields: [
      { fieldPath: 'businessId', order: 'ASCENDING' },
      { fieldPath: 'timestamp',  order: 'DESCENDING' },
    ]
  },
  {
    collection: 'comments',
    fields: [
      { fieldPath: 'businessId', order: 'ASCENDING' },
      { fieldPath: 'createdAt',  order: 'ASCENDING' },
    ]
  },
  {
    collection: 'users',
    fields: [
      { fieldPath: 'createdAt', order: 'DESCENDING' },
    ]
  },
]

async function main() {
  const auth = new GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  })
  const client = await auth.getClient()
  const token  = await client.getAccessToken()
  const tok    = token.token

  for (const idx of INDEXES) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/${DATABASE}/collectionGroups/${idx.collection}/indexes`
    const body = JSON.stringify({
      queryScope: 'COLLECTION',
      fields: idx.fields.map(f => ({ fieldPath: f.fieldPath, order: f.order })),
    })

    await new Promise((resolve, reject) => {
      const req = https.request(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tok}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        }
      }, res => {
        let data = ''
        res.on('data', d => data += d)
        res.on('end', () => {
          const parsed = JSON.parse(data)
          if (res.statusCode === 200 || res.statusCode === 409) {
            console.log(`✓ ${idx.collection} [${idx.fields.map(f=>f.fieldPath).join(', ')}] — ${res.statusCode === 409 ? 'already exists' : 'created, building...'}`)
          } else {
            console.error(`✗ ${idx.collection} — ${res.statusCode}: ${parsed.error?.message}`)
          }
          resolve()
        })
      })
      req.on('error', reject)
      req.write(body)
      req.end()
    })
  }
  console.log('\nAll indexes submitted. They may take a few minutes to build.')
}

main().catch(console.error)
