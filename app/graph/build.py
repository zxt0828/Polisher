"""Assembles the LangGraph: adds nodes, connects edges; conditional edges and loops come later."""

from langgraph.graph import END, START, StateGraph

from app.graph.nodes import refine_node, tailor_node
from app.graph.state import TailorState

_graph = StateGraph(TailorState)
_graph.add_node("tailor", tailor_node)
_graph.add_node("refine", refine_node)

# Live pipeline: tailor (coverage, Opus) -> refine (naturalness, Sonnet-5) -> done.
_graph.add_edge(START, "tailor")
_graph.add_edge("tailor", "refine")
_graph.add_edge("refine", END)

# RESERVED extension point (see app/graph/nodes.py score_node, TAILOR_REFINE_GRAPH.md):
# a future score_node (thin wrapper over a scoring chain) would slot in after refine to
# produce a job-fit score shown to the user, e.g.
#     _graph.add_node("score", score_node)
#     _graph.add_edge("refine", "score")
#     _graph.add_edge("score", END)
# Not wired today: the live graph stays tailor -> refine -> END.

tailor_graph = _graph.compile()
