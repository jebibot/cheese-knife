// node tests/expand-followings-check.js
// web/inject.js 의 isNavSection·expandFollowings 를 그대로 잘라 와서
// 치지직 사이드바 fiber 구조(iC name → $U nav → aW 더보기)로 돌린다.
const fs = require("fs");
const assert = require("assert");
const src = fs.readFileSync(__dirname + "/../web/inject.js", "utf8");
const start = src.indexOf("  const isNavSection");
const end = src.indexOf("  let refreshInterval;");
const snippet = src.slice(start, end);

class Element {
    constructor(cls = "") { this.className = cls; this.children = []; this.ariaExpanded = null; this.clicks = 0; }
    add(c) { this.children.push(c); return c; }
    all() { return this.children.flatMap((c) => [c, ...c.all()]); }
    querySelectorAll(sel) {
        if (sel === "nav") return this.all().filter((e) => e.tag === "nav");
        throw new Error(sel);
    }
    querySelector(sel) {
        const m = sel.match(/^\[class\*="(.+)"\]$/);
        return this.all().find((e) => e.className.includes(m[1])) || null;
    }
    click() { this.clicks++; }
}
const fiberKey = "__reactFiber$test";
const getReactFiber = (n) => n?.[fiberKey];
// 구역 하나: 이름 붙은 경계 → 오류 경계 → $U → <nav> → 더보기 버튼
const section = (sidebar, sidebarFiber, name) => {
    const nav = sidebar.add(new Element("_section_1yqp7_26"));
    nav.tag = "nav";
    const boundary = { memoizedProps: { name, silent: true }, return: sidebarFiber };
    const inner = { memoizedProps: { resetKeys: undefined }, return: boundary };
    const u = { memoizedProps: { expanded: true, label: "x" }, return: inner };
    nav[fiberKey] = { stateNode: nav, memoizedProps: {}, return: u };
    const more = nav.add(new Element("_container_x _more_button_1yqp7_155"));
    more.ariaExpanded = "false";
    return more;
};

const run = async () => {
    const config = { expandFollowings: true };
    const { expandFollowings } = new Function("config", "getReactFiber", "Element",
        snippet + "; return { expandFollowings };")(config, getReactFiber, Element);

    const sidebar = new Element("sidebar");
    const sidebarFiber = { stateNode: sidebar, memoizedProps: {}, return: null };
    // 카테고리가 먼저 그려지고, 팔로잉은 0.3초 뒤에 나타난다
    const categoriesMore = section(sidebar, sidebarFiber, "nav-categories");
    let followingsMore;
    setTimeout(() => { followingsMore = section(sidebar, sidebarFiber, "nav-following"); }, 300);

    await expandFollowings(sidebar);
    assert.strictEqual(categoriesMore.clicks, 0, "카테고리 더보기를 누르면 안 됨");
    assert.strictEqual(followingsMore.clicks, 1, "팔로잉 더보기를 한 번 눌러야 함");

    // 이미 펼친 상태면 누르지 않는다
    const s2 = new Element("sidebar2");
    const b2 = section(s2, { stateNode: s2, return: null }, "nav-following");
    b2.ariaExpanded = "true";
    await expandFollowings(s2);
    assert.strictEqual(b2.clicks, 0);
    console.log("OK");
};
run().catch((e) => { console.error(e); process.exit(1); });
