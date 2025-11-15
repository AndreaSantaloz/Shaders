#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    vec2 D = st - .5;
    D.x *= u_resolution.x / u_resolution.y;
    float r = length(D) * 1.5;
    float a = atan(D.y, D.x);
    float N=12., P=6.;
    float B = pow(abs(cos(a * P)), 3.);
    float L = pow(abs(cos(a * N * 12.)), .4);
    float T = 1. - pow(r, .5);
    float F = B * (.8 + .2 * L) * (.3 + .7 * T);
    float R = .25 + .5 * F;
    float m = smoothstep(R, R - .01, r);
    vec3 cR = vec3(.9, .1, .2);
    vec3 cG = vec3(.1, .5, .2);
    vec3 cY = vec3(1., .9, 0.);
    float i = floor(mod(a * N / 6.28318 + 1., N));
    float Alt = 1. - mod(i, 2.);
    float A = mod(a * N / 6.28318, 1.);
    vec3 c;
    if (Alt > .5) { // Sector ROJO: Verde solo en el 1% final
        c = mix(cR, cG, step(0.99, A)); 
    } else { // Sector VERDE: Verde solo en el 1% inicial, luego Rojo
        c = mix(cG, cR, step(0.01, A)); // <-- CAMBIO CLAVE: 0.1 a 0.01
    }
    c *= smoothstep(0., .4, r);
    float center = smoothstep(.08, .07, r);
    c = mix(c, cY, center);
    vec3 b = vec3(.05);
    gl_FragColor = vec4(mix(b, c, m), 1.);
}
// Byte Count: 491
