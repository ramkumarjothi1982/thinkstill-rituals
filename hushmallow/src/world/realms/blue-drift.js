export default function create() {
  return { build() {}, frame(g, st) { g.fillStyle = '#222'; g.fillRect(0, 0, st.W, st.H); }, pulse() {} };
}
