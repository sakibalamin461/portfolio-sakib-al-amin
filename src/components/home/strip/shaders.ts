/*
 * Card shader for the home work strip.
 *
 * Every card is a window onto ONE marble pattern computed in screen space,
 * so the swirl flows continuously behind all the inactive cards. The open
 * card reveals its image through a circle whose edge is broken up by
 * high-frequency noise, and dissolves back into the marble when it closes.
 */

export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uTex;
  uniform vec2 uSize;      // card size, px
  uniform vec2 uMaxSize;   // size of an open card, px (image is laid out at this size)
  uniform vec2 uImage;     // image size, px
  uniform vec2 uRes;       // screen size, px
  uniform vec2 uOrigin;    // card's top-left on screen, px (top-left origin)
  uniform vec4 uClip;      // home reveal: inset top, right, bottom, left (px)
  uniform float uActive;   // 0 → 1 as the card opens
  uniform float uOut;      // 0 → 1 as the card closes
  uniform float uHover;
  uniform float uVisible;  // 0 → 1 once the image has loaded
  uniform float uParallax;
  uniform float uTime;
  uniform float uScroll;   // accumulated strip movement, pushes the marble sideways
  uniform vec2 uCursor;    // px, top-left origin
  uniform vec2 uCursorVel; // px per frame, decaying

  varying vec2 vUv;

  // ── value noise + fbm (the reveal edge) ──
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.98923445328, 4.137643425614414))) * 43758.54432453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 s = f * f * (3.0 - 2.0 * f);
    float n = mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), s.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), s.x), s.y);
    return n * n;
  }
  float fbm(vec2 p) {
    float t = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { t += vnoise(p) * a; p *= 2.0; a *= 0.5; }
    return t;
  }

  // ── simplex noise (the marble flow) ──
  vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m; m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  // Near-black ink bands, folded by a slowly drifting flow.
  vec3 marble(vec2 px) {
    vec2 p = px / uRes.y;
    p.x += uScroll;
    // the cursor stirs the ink
    vec2 toCursor = (px - uCursor) / uRes.y;
    p -= uCursorVel / uRes.y * exp(-dot(toCursor, toCursor) / 0.012) * 6.0;
    float t = uTime * 0.035;
    vec2 q = p * 1.5;
    q += 0.6 * vec2(snoise(q * 0.85 + vec2(t, -t * 0.7)), snoise(q * 0.85 + vec2(4.1 - t * 0.8, 1.7 + t)));
    q += 0.32 * vec2(snoise(q * 1.9 + vec2(2.3, t * 1.3)), snoise(q * 1.9 + vec2(-t * 1.1, 5.9)));
    float bands = q.y * 3.4 + snoise(q * 0.55 + 7.0) * 0.9;
    float f = fract(bands);
    float aa = fwidth(bands) * 1.2;
    float ink = smoothstep(0.5 - aa, 0.5 + aa, f) * (1.0 - smoothstep(1.0 - aa, 1.0, f));
    return vec3(mix(0.012, 0.068, ink));
  }

  void main() {
    // card-local pixels, top-left origin
    vec2 local = vec2(vUv.x, 1.0 - vUv.y) * uSize;
    if (local.y < uClip.x || local.x > uSize.x - uClip.y || local.y > uSize.y - uClip.z || local.x < uClip.w) discard;

    vec2 px = uOrigin + local;                 // screen px, top-left origin
    vec2 screen = vec2(px.x, uRes.y - px.y);   // bottom-left origin, like gl_FragCoord

    float open = uActive * uVisible;
    float hover = uHover * min(1.0, open);
    float zoom = 0.96 + open * 0.04 - hover * 0.03;

    // image UV, laid out at the open size and cropped by the card ("cover" fit)
    vec2 st = (vUv * 2.0 - 1.0) * zoom;
    st.x += uParallax * (1.0 - zoom);
    vec2 uvc = st * 0.5 + 0.5;
    vec2 toCursor = (px - uCursor) / uRes.y;
    vec2 push = vec2(uCursorVel.x, -uCursorVel.y) / uSize * exp(-dot(toCursor, toCursor) / 0.02) * 0.9;
    uvc -= push;
    float sx = uMaxSize.x / uImage.x, sy = uMaxSize.y / uImage.y;
    float s = max(sx, sy);
    vec2 cover = uImage * s / uSize;
    vec2 imgUv = (uvc - 0.5) / cover + 0.5;
    vec3 image = texture2D(uTex, imgUv).rgb;

    // radial reveal with a noisy edge
    vec2 v = (vUv * 2.0 - 1.0) * vec2(uSize.x / uSize.y, 1.0) / (length(uSize) / uSize.y);
    float n = fbm(vec2(screen.x / uRes.y, screen.y / uRes.y) * 50.0);
    float u = open + open * n;
    float reveal = 1.0 - smoothstep(u - n, u, length(v));
    float gone = max(0.0, uOut + n * uOut);
    float mask = clamp(reveal - clamp(gone, 0.0, 1.0), 0.0, 1.0);

    gl_FragColor = vec4(mix(marble(px), image, mask), 1.0);
  }
`;
