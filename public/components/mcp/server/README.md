<div align="center">
  <img src="https://tidelight.app/tidelight-mark.svg" alt="Tidelight" width="56" height="56" />
  <h1>@tidelight/mcp</h1>
  <p><strong>A secure local stdio bridge to Tidelightâ€™s hosted MCP service.</strong></p>
  <p><a href="https://tidelight.app">Product</a> Â· <a href="https://dev.tidelight.app#mcp">Connection guide</a> Â· <a href="https://github.com/TidelightOrg/tidelight">Mother repository</a></p>
</div>

---

The package forwards MCP discovery and tool calls from stdio-only clients to the authenticated Tidelight Streamable HTTP service. The remote service continues to enforce credentials, scopes, quotas, and tenant boundaries.

## Install

```sh
npm install --global @tidelight/mcp@0.1.2
```

Use Node.js 22 or later. Create a project API key with only the scopes the client needs.

## Build and test from the mother repository

```sh
cd public/components/mcp/server
npm ci
npm test
npm run build
```

The package test suite verifies the protocol core, scoped tool discovery, remote MCP forwarding, safe endpoint validation, and that the API key is not included in tool results or connection errors.

## Run the bridge

Use Node.js 22, the runtime currently tested in package CI. Create a project API key with `market:read`, `research:run`, or both, then provide it through your local secret manager or process environment:

```sh
export TIDELIGHT_API_KEY='YOUR_TIDELIGHT_PROJECT_KEY'
tidelight-mcp
```

Run `tidelight-mcp` after installation. The bridge writes MCP protocol traffic to stdout; connection errors go to stderr. It never prints the API key. The default upstream endpoint is `https://mcp.tidelight.app/mcp`. A custom `TIDELIGHT_MCP_URL` is accepted only over HTTPS, except for loopback HTTP during local testing.

## Client configuration

Point a stdio-capable MCP client at the built CLI. Client configuration formats differ; the following is the general command shape, not a copyable absolute path:

```json
{
  "mcpServers": {
    "tidelight": {
      "command": "node",
      "args": ["/absolute/path/to/tidelight/public/components/mcp/server/dist/cli.js"],
      "env": {
        "TIDELIGHT_API_KEY": "YOUR_TIDELIGHT_PROJECT_KEY"
      }
    }
  }
}
```

Keep the key in the clientâ€™s protected environment or secret store. Do not commit real credentials to the client configuration. The bridge accepts API keys; OAuth is available when connecting a compatible client directly to the hosted endpoint.

## Tools and access

The upstream Tidelight service returns only tools allowed by the keyâ€™s current scopes. The current tools are:

| Tools | Scope |
| --- | --- |
| `tidelight_search_tokenized_equities`, `tidelight_get_tokenized_equity` | `market:read` |
| `tidelight_start_company_research`, `tidelight_get_research_job`, `tidelight_cancel_research_job` | `research:run` |

Instrument results identify supported Reality tokenized-equity spot products; they are not direct US shares or stock perpetual contracts. Research results preserve source context and do not expose private model reasoning.

## Published container

The official container image is built from this repository's MCP server source and published to GitHub Container Registry. It uses the same stdio bridge as the npm package; the API key is supplied at runtime and is never baked into the image.

```sh
docker pull ghcr.io/tidelightorg/tidelight-mcp:0.1.1
export TIDELIGHT_API_KEY='YOUR_TIDELIGHT_PROJECT_KEY'
docker run --rm -i -e TIDELIGHT_API_KEY ghcr.io/tidelightorg/tidelight-mcp:0.1.1
```

Use a scoped project key with `market:read`, `research:run`, or both. For an MCP client that supports Docker-backed stdio servers, configure `docker` as the command, `run`, `--rm`, `-i`, `-e`, `TIDELIGHT_API_KEY`, and `ghcr.io/tidelightorg/tidelight-mcp:0.1.1` as arguments, with the key held in the client's protected environment. Pin a version tag for reproducible deployments; `latest` tracks the most recent main-branch build.

The image supports `linux/amd64` and `linux/arm64`.

## Library interface

The protocol server is exported from the package root. The local-to-remote bridge is available at `@tidelight/mcp/proxy` and exports `createTidelightMcpProxy({ apiKey, endpoint? })`, `validateTidelightMcpProxyOptions`, and `DEFAULT_TIDELIGHT_MCP_URL`. The proxy resolves after authenticated upstream MCP initialization and returns `{ server, close }`; connect its `server` to a client transport and call `close()` when the client session ends. The CLI performs this lifecycle for stdio clients.

## Compatibility and troubleshooting

| Item | Current support |
| --- | --- |
| Local transport | MCP stdio |
| Upstream transport | Streamable HTTP |
| Upstream authentication | Tidelight project API key in `TIDELIGHT_API_KEY` |
| Runtime | Node.js 22 tested; package requires Node.js 22+ |
| Third-party clients | Not individually certified by this package test |
| API service | Tidelight MCP service compatible with the current package protocol tests |

- **No tools appear:** confirm the key carries a supported scope and reconnect so the client repeats discovery.
- **Unauthorized:** create a new active project key and make sure the client process receives it in `TIDELIGHT_API_KEY×}ùÒÚ$z{-®éÜj×ì(€€€€€€‰Ù•ÉÍ¥½¸ˆè€ˆÄ¸À¸Èˆ°(€€€€€€‰É•Í½±Ù•ˆè€‰¡ÑÑÁÌè¼½É•¥ÍÑÉä¹¹Áµ©Ì¹½Éœ½Í¥‘”µ¡…¹¹•°µİ•…­µ…À¼´½Í¥‘”µ¡…¹¹•°µİ•…­µ…À´Ä¸À¸È¹Ñèˆ°(€€€€€€‰¥¹Ñ•É¥Ñäˆè€‰Í¡„ÔÄÈµ]AL½!Ù!EQe¹!¥Í1¼å5Å	!=)¬É­!<½Ñ±ÁÙ±‘åÉ¹•´Ñ…•EÀÑ¡…¤ÍåÑ¡ÍİœÙÀÀÅ½M½Q°ÔáÉÁ¥©É‰ÈÉ¬Éôôˆ°(€€€€€€‰±¥•¹Í”ˆè€‰5%Pˆ°(€€€€€€‰‘•Á•¹‘•¹¥•Ìˆèì(€€€€€€€€‰…±°µ‰½Õ¹ˆè€‰xÄ¸À¸Èˆ°(€€€€€€€€‰•Ìµ•ÉÉ½ÉÌˆè€‰xÄ¸Ì¸Àˆ°(€€€€€€€€‰•Ğµ¥¹ÑÉ¥¹Í¥Œˆè€‰xÄ¸È¸Ôˆ°(€€€€€€€€‰½‰©•Ğµ¥¹ÍÁ•Ğˆè€‰xÄ¸ÄÌ¸Ìˆ°(€€€€€€€€‰Í¥‘”µ¡…¹¹•°µµ…Àˆè€‰xÄ¸À¸Äˆ(€€€€€ô°(€€€€€€‰•¹¥¹•Ìˆèì(€€€€€€€€‰¹½‘”ˆè€ˆøô€À¸Ğˆ(€€€€€ô°(€€€€€€‰™Õ¹‘¥¹œˆèì(€€€€€€€€‰ÕÉ°ˆè€‰¡ÑÑÁÌè¼½¥Ñ¡Õˆ¹½´½ÍÁ½¹Í½ÉÌ½±©¡…Éˆˆ(€€€€€ô(€€€ô°(€€€€‰¹½‘•}µ½‘Õ±•Ì½ÍÑ…ÑÕÍ•Ìˆèì(€€€€€€‰Ù•ÉÍ¥½¸ˆè€ˆÈ¸À¸Èˆ°(€€€€€€‰É•Í½±Ù•ˆè€‰¡ÑÑÁÌè¼½É•¥ÍÑÉä¹¹Áµ©Ì¹½Éœ½ÍÑ…ÑÕÍ•Ì¼´½ÍÑ…ÑÕÍ•Ì´È¸À¸È¹Ñèˆ°(€€€€€€‰¥¹Ñ•É¥Ñäˆè€‰Í¡„ÔÄÈµÙäÔÕXÍİÕ­¹I¼¬Ñ¥=PÕ™@ÅÍ±HáİE½¡Y‘­¹¥iA5Á5ÍÑ…-)E]¡İ¥e	)ÍU°ÉÁQ¹Q¥¡¡	e¹I¡iE!	¥IÜôôˆ°(€€€€€€‰±¥•¹Í”ˆè€‰5%Pˆ°(€€€€€€‰•¹¥¹•Ìˆèì(€€€€€€€€‰¹½‘”ˆè€ˆøô€À¸àˆ(€€€€€ô(€€€ô°(€€€€‰¹½‘•}µ½‘Õ±•Ì½Ñ½¥‘•¹Ñ¥™¥•Èˆèì(€€€€€€‰Ù•ÉÍ¥½¸ˆè€ˆÄ¸À¸Äˆ°(€€€€€€‰É•Í½±Ù•ˆè€‰¡ÑÑÁÌè¼½É•¥ÍÑÉä¹¹Áµ©Ì¹½Éœ½Ñ½¥‘•¹Ñ¥™¥•È¼´½Ñ½¥‘•¹Ñ¥™¥•È´Ä¸À¸Ä¹Ñèˆ°(€€€€€€‰¥¹Ñ•É¥Ñäˆè€‰Í¡„ÔÄÈµ¼ÕÍMA-­œ½%E9µ ĞÍXÀ½Õ•É1ÉÁéY•‘­U áÑ9Ù…•aÁ™ÁÕİ©-•¹±M½à¼É<½	Q±iUÑ”­)İÌÕe¡èØÀáA±!Iôôˆ°(€€€€€€‰±¥•¹Í”ˆè€‰5%Pˆ°(€€€€€€‰•¹¥¹•Ìˆèì(€€€€€€€€‰¹½‘”ˆè€ˆøôÀ¸Øˆ(€€€€€ô(€€€ô°(€€€€‰¹½‘•}µ½‘Õ±•Ì½ÑåÁ”µ¥Ìˆèì(€€€€€€‰Ù•ÉÍ¥½¸ˆè€ˆÈ¸Ä¸Àˆ°(€€€€€€‰É•Í½±Ù•ˆè€‰¡ÑÑÁÌè¼½É•¥ÍÑÉä¹¹Áµ©Ì¹½Éœ½ÑåÁ”µ¥Ì¼´½ÑåÁ”µ¥Ì´È¸Ä¸À¹Ñèˆ°(€€€€€€‰¥¹Ñ•É¥Ñäˆè€‰Í¡„ÔÄÈµ™…e!ÜÁ…¹	‰Œ½­]ÍéQ¹áM=U`å‰=	Ñ¡Ù‘1Í%±½]==ÑLÁé¥Eeİ%Í­0å¥ai0Í­aá=½hÑµ5Qôôˆ°(€€€€€€‰±¥•¹Í”ˆè€‰5%Pˆ°(€€€€€€‰‘•Á•¹‘•¹¥•Ìˆèì(€€€€€€€€‰½¹Ñ•¹ĞµÑåÁ”ˆè€‰xÈ¸À¸Àˆ°(€€€€€€€€‰µ•‘¥„µÑåÁ•Èˆè€‰xÄ¸Ä¸Àˆ°(€€€€€€€€‰µ¥µ”µÑåÁ•Ìˆè€‰xÌ¸À¸Àˆ(€€€€€ô°(€€€€€€‰•¹¥¹•Ìˆèì(€€€€€€€€‰¹½‘”ˆè€ˆøô€Äàˆ(€€€€€ô°(€€€€€€‰™Õ¹‘¥¹œˆèì(€€€€€€€€‰ÑåÁ”ˆè€‰½Á•¹½±±•Ñ¥Ù”ˆ°(€€€€€€€€‰ÕÉ°ˆè€‰¡ÑÑÁÌè¼½½Á•¹½±±•Ñ¥Ù”¹½´½•áÁÉ•ÍÌˆ(€€€€€ô(€€€ô°(€€€€‰¹½‘•}µ½‘Õ±•Ì½ÑåÁ”µ¥Ì½¹½‘•}µ½‘Õ±•Ì½½¹Ñ•¹ĞµÑåÁ”ˆèì(€€€€€€‰Ù•ÉÍ¥½¸ˆè€ˆÈ¸Ä¸Àˆ°(€€€€€€‰É•Í½±Ù•ˆè€‰¡ÑÑÁÌè¼½É•¥ÍÑÉä¹¹Áµ©Ì¹½Éœ½½¹Ñ•¹ĞµÑåÁ”¼´½½¹Ñ•¹ĞµÑåÁ”´È¸Ä¸À¹Ñèˆ°(€€€€€€‰¥¹Ñ•É¥Ñäˆè€‰Í¡„ÔÄÈµµ¨İUAaÁ©…Å…=ÍÕ­9iIU™¤É0İ½Ùİµİ!XÁ<äİ•<ÅÅÁá	iÕå©±iÉàÕÍ•Q…9	œÅTØ­¼ÌÕİÁ„ÌÕE™Œ¬İ…œôôˆ°(€€€€€€‰±¥•¹Í”ˆè€‰5%Pˆ°(€€€€€€‰•¹¥¹•Ìˆèì(€€€€€€€€‰¹½‘”ˆè€ˆøôÄàˆ(€€€€€ô°(€€€€€€‰™Õ¹‘¥¹œˆèì(€€€€€€€€‰ÑåÁ”ˆè€‰½Á•¹½±±•Ñ¥Ù”ˆ°(€€€€€€€€‰ÕÉ°ˆè€‰¡ÑÑÁÌè¼½½Á•¹½±±•Ñ¥Ù”¹½´½•áÁÉ•ÍÌˆ(€€€€€ô(€€€ô°(€€€€‰¹½‘•}µ½‘Õ±•Ì½ÑåÁ•ÍÉ¥ÁĞˆèì(€€€€€€‰Ù•ÉÍ¥½¸ˆè€ˆÔ¸ä¸Ìˆ°(€€€€€€‰É•Í½±Ù•ˆè€‰¡ÑÑÁÌè¼½É•¥ÍÑÉä¹¹Áµ©Ì¹½Éœ½ÑåÁ•ÍÉ¥ÁĞ¼´½ÑåÁ•ÍÉ¥ÁĞ´Ô¸ä¸Ì¹Ñèˆ°(€€€€€€‰¥¹Ñ•É¥Ñäˆè€‰Í¡„ÔÄÈµ©°ÅÙiéA¥¹1Èå•UĞÍ(½ĞİXÙ9ÜåE©Ù	A‘åÍèå-™EĞÅ™EÉÉdÑÙ-E‘¥…UÁPÑ‰a±ˆÅI!¡1ÁÀáİÑ´Ù4ÕQMÜôôˆ°(€€€€€€‰‘•ØˆèÑÉÕ”°(€€€€€€‰±¥•¹Í”ˆè€‰Á…¡”´È¸Àˆ°(€€€€€€‰‰¥¸ˆèì(€€€€€€€€‰ÑÍŒˆè€‰‰¥¸½ÑÍŒˆ°(€€€€€€€€‰ÑÍÍ•ÉÙ•Èˆè€‰‰¥¸½ÑÍÍ•ÉÙ•Èˆ(€€€€€ô°(€€€€€€‰•¹¥¹•Ìˆèì(€€€€€€€€‰¹½‘”ˆè€ˆøôÄĞ¸ÄÜˆ(€€€€€ô(€€€ô°(€€€€‰¹½‘•}µ½‘Õ±•Ì½Õ¹‘¥¤µÑåÁ•Ìˆèì(€€€€€€‰Ù•ÉÍ¥½¸ˆè€ˆØ¸ÈÄ¸Àˆ°(€€€€€€‰É•Í½±Ù•ˆè€‰¡ÑÑÁÌè¼½É•¥ÍÑÉä¹¹Áµ©Ì¹½Éœ½Õ¹‘¥¤µÑåÁ•Ì¼´½Õ¹‘¥¤µÑåÁ•Ì´Ø¸ÈÄ¸À¹Ñèˆ°(€€€€€€‰¥¹Ñ•É¥Ñäˆè€‰Í¡„ÔÄÈµ¥İiÅœÁEÉœåI…ØÕ Ñ¸Á4ØÑŒÍµ­HÔå(ÙİEÀ¬İÑ¹$ÁÍµá…•‘…e19<ĞÑ•PÑÑ		İ©‰Q¥A5±ĞÉ5ÁPå å)Dôôˆ°(€€€€€€‰‘•ØˆèÑÉÕ”°(€€€€€€‰±¥•¹Í”ˆè€‰5%Pˆ(€€€ô°(€€€€‰¹½‘•}µ½‘Õ±•Ì½Õ¹Á¥Á”ˆèì(€€€€€€‰Ù•ÉÍ¥½¸ˆè€ˆÄ¸À¸Àˆ°(€€€€€€‰É•Í½±Ù•ˆè€‰¡ÑÑÁÌè¼½É•¥ÍÑÉä¹¹Áµ©Ì¹½Éœ½Õ¹Á¥Á”¼´½Õ¹Á¥Á”´Ä¸À¸À¹Ñèˆ°(€€€€€€‰¥¹Ñ•É¥Ñäˆè€‰Í¡„ÔÄÈµÁ©äÉ‰e¡MÍÕ™İ]±-İAŒ­°Í8Ü­İÕ)±,ÙÕèÁe‘)=±E‰°Ù©¼½e±A¤Ñµˆá…U­Yá	İXá9Õé•åA9ÅI­ÍÍ¡éÑ-Dôôˆ°(€€€€€€‰±¥•¹Í”ˆè€‰5%Pˆ°(€€€€€€‰•¹¥¹•Ìˆèì(€€€€€€€€‰¹½‘”ˆè€ˆøô€À¸àˆ(€€€€€ô(€€€ô°(€€€€‰¹½‘•}µ½‘Õ±•Ì½Ù…Éäˆèì(€€€€€€‰Ù•ÉÍ¥½¸ˆè€ˆÄ¸Ä¸Èˆ°(€€€€€€‰É•Í½±Ù•ˆè€‰¡ÑÑÁÌè¼½É•¥ÍÑÉä¹¹Áµ©Ì¹½Éœ½Ù…Éä¼´½Ù…Éä´Ä¸Ä¸È¹Ñèˆ°(€€€€€€‰¥¹Ñ•É¥Ñäˆè€‰Í¡„ÔÄÈµ	9‰]1™Á•UA…‰¡­aUY´Á¨áÕÕÙIåQ Õ½ÙI„½‘å½Ü½	Å‰i)å¬Õ™T­%éE=éµ-éeÅeI%M½I¡‘EÈÍ•%h½AaÅœôôˆ°(€€€€€€‰±¥•¹Í”ˆè€‰5%Pˆ°(€€€€€€‰•¹¥¹•Ìˆèì(€€€€€€€€‰¹½‘”ˆè€ˆøô€À¸àˆ(€€€€€ô(€€€ô°(€€€€‰¹½‘•}µ½‘Õ±•Ì½İ¡¥ ˆèì(€€€€€€‰Ù•ÉÍ¥½¸ˆè€ˆÈ¸À¸Èˆ°(€€€€€€‰É•Í½±Ù•ˆè€‰¡ÑÑÁÌè¼½É•¥ÍÑÉä¹¹Áµ©Ì¹½Éœ½İ¡¥ ¼´½İ¡¥ ´È¸À¸È¹Ñèˆ°(€€€€€€‰¥¹Ñ•É¥Ñäˆè€‰Í¡„ÔÄÈµ	1$ÍQ°ÅQ\ÍAÙ°ÜÁ°ÍåÄÍdØÑ¤­…İÁİaÅÍ	e]­­Å5Ñ¹‰aÉ5­å¨İÉ¡\Á­Õáé)…ea©\Õ½…Á-95-95©¥‰ôôˆ°(€€€€€€‰±¥•¹Í”ˆè€‰%Mˆ°(€€€€€€‰‘•Á•¹‘•¹¥•Ìˆèì(€€€€€€€€‰¥Í•á”ˆè€‰xÈ¸À¸Àˆ(€€€€€ô°(€€€€€€‰‰¥¸ˆèì(€€€€€€€€‰¹½‘”µİ¡¥ ˆè€‰‰¥¸½¹½‘”µİ¡¥ ˆ(€€€€€ô°(€€€€€€‰•¹¥¹•Ìˆèì(€€€€€€€€‰¹½‘”ˆè€ˆøô€àˆ(€€€€€ô(€€€ô°(€€€€‰¹½‘•}µ½‘Õ±•Ì½İÉ…ÁÁäˆèì(€€€€€€‰Ù•ÉÍ¥½¸ˆè€ˆÄ¸À¸Èˆ°(€€€€€€‰É•Í½±Ù•ˆè€‰¡ÑÑÁÌè¼½É•¥ÍÑÉä¹¹Áµ©Ì¹½Éœ½İÉ…ÁÁä¼´½İÉ…ÁÁä´Ä¸À¸È¹Ñèˆ°(€€€€€€‰¥¹Ñ•É¥Ñäˆè€‰Í¡„ÔÄÈµ°ÑMÀ½IÍ•½Èåİ0ÙÙXÈ­QÕE¸ØÍ‘5­A©h½ÍÀåa­¡Q‰Xå-±ALÅáUÍhÍÔÜ½%E<ÑİáÑÑ‰ÁEAIHÍEÙ•éADôôˆ°(€€€€€€‰±¥•¹Í”ˆè€‰%Mˆ(€€€ô°(€€€€‰¹½‘•}µ½‘Õ±•Ì½é½ˆèì(€€€€€€‰Ù•ÉÍ¥½¸ˆè€ˆĞ¸Ø¸Üˆ°(€€€€€€‰É•Í½±Ù•ˆè€‰¡ÑÑÁÌè¼½É•¥ÍÑÉä¹¹Áµ©Ì¹½Éœ½é½¼´½é½´Ğ¸Ø¸Ü¹Ñèˆ°(€€€€€€‰¥¹Ñ•É¥Ñäˆè€‰Í¡„ÔÄÈµœá\ÉÉ­TÙ„áÕ¹ÑŒÀÔÍ™`ÅÕY	-é4İåÅá\¼Íéİ¬àÌ¬ÙIåÈ­M-=ÕX­ŒÁİ	¡UİéXÅA……Áµi ­ÉµUéA˜¬Íİœôôˆ°(€€€€€€‰±¥•¹Í”ˆè€‰5%Pˆ°(€€€€€€‰™Õ¹‘¥¹œˆèì(€€€€€€€€‰ÕÉ°ˆè€‰¡ÑÑÁÌè¼½¥Ñ¡Õˆ¹½´½ÍÁ½¹Í½ÉÌ½½±¥¹¡…­Ìˆ(€€€€€ô(€€€ô°(€€€€‰¹½‘•}µ½‘Õ±•Ì½é½µÑ¼µ©Í½¸µÍ¡•µ„ˆèì(€€€€€€‰Ù•ÉÍ¥½¸ˆè€ˆÌ¸ÈÔ¸Èˆ°(€€€€€€‰É•Í½±Ù•ˆè€‰¡ÑÑÁÌè¼½É•¥ÍÑÉä¹¹Áµ©Ì¹½Éœ½é½µÑ¼µ©Í½¸µÍ¡•µ„¼´½é½µÑ¼µ©Í½¸µÍ¡•µ„´Ì¸ÈÔ¸È¹Ñèˆ°(€€€€€€‰¥¹Ñ•É¥Ñäˆè€‰Í¡„ÔÄÈµ<½A™¹ÁPÅá-M•EeM™I$ÕäÍ¡A˜äÅµ-YÕe1U!i)5¥ÁÑÙ@ĞÅ5M¹]½™´á‘¹´ÀÈÔÙi9™i%4İMéÕM5¹©!ôôˆ°(€€€€€€‰±¥•¹Í”ˆè€‰%Mˆ°(€€€€€€‰Á••É•Á•¹‘•¹¥•Ìˆèì(€€€€€€€€‰é½ˆè€‰xÌ¸ÈÔ¸ÈàñğxĞˆ(€€€€€ô(€€€ô(€ô)ô(