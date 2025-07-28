import {
  parse
} from "./chunk-KNTSGUI3.js";
import "./chunk-SDZMAK64.js";
import "./chunk-YLO4FJCN.js";
import "./chunk-P4D6DH7H.js";
import "./chunk-WQMBZQAV.js";
import "./chunk-D5MJQERE.js";
import "./chunk-JLMAE6FG.js";
import "./chunk-DSDVIPSA.js";
import "./chunk-EBENUOVC.js";
import "./chunk-3KOL2IQZ.js";
import {
  package_default
} from "./chunk-MJO4EG7R.js";
import {
  selectSvgElement
} from "./chunk-ECOC2QEZ.js";
import {
  __name,
  configureSvgSize,
  log
} from "./chunk-NGG7WLMS.js";
import "./chunk-NBWFZMTS.js";
import "./chunk-ST3SR5TB.js";
import "./chunk-FDBJFBLO.js";

// node_modules/mermaid/dist/chunks/mermaid.core/infoDiagram-LHK5PUON.mjs
var parser = {
  parse: __name(async (input) => {
    const ast = await parse("info", input);
    log.debug(ast);
  }, "parse")
};
var DEFAULT_INFO_DB = {
  version: package_default.version + (true ? "" : "-tiny")
};
var getVersion = __name(() => DEFAULT_INFO_DB.version, "getVersion");
var db = {
  getVersion
};
var draw = __name((text, id, version) => {
  log.debug("rendering info diagram\n" + text);
  const svg = selectSvgElement(id);
  configureSvgSize(svg, 100, 400, true);
  const group = svg.append("g");
  group.append("text").attr("x", 100).attr("y", 40).attr("class", "version").attr("font-size", 32).style("text-anchor", "middle").text(`v${version}`);
}, "draw");
var renderer = { draw };
var diagram = {
  parser,
  db,
  renderer
};
export {
  diagram
};
//# sourceMappingURL=infoDiagram-LHK5PUON-TDGTX4IC.js.map
