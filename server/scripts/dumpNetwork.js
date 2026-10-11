import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getGraph } from '../data/roadGraph.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function dump() {
  console.log("Loading graph...");
  const { nodes, edges, stops } = await getGraph();
  
  const nodeCount = Object.keys(nodes).length;
  const edgeCount = Object.keys(edges).length;
  const stopCount = stops.length;
  
  console.log(`Graph loaded:`);
  console.log(`- Nodes: ${nodeCount}`);
  console.log(`- Edges: ${edgeCount}`);
  console.log(`- Stops: ${stopCount}`);
  
  const outPath = path.join(__dirname, '../../client/src/data/roadNetwork.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  
  const payload = {
    nodes,
    edges,
    stops
  };
  
  fs.writeFileSync(outPath, JSON.stringify(payload));
  console.log(`Dumped successfully to ${outPath}`);
  
  if (nodeCount !== 644 || edgeCount !== 1259 || stopCount !== 101) {
    console.error("❌ ERROR: Counts do NOT match the expected graph size (644 nodes, 1259 edges, 101 stops).");
    process.exit(1);
  } else {
    console.log("✅ SUCCESS: Counts match exactly.");
    process.exit(0);
  }
}

dump().catch(err => {
  console.error(err);
  process.exit(1);
});
