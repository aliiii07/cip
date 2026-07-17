"""Wires the four-agent loop as a LangGraph StateGraph.

Every strategy passes through all four agents in order; none may be
skipped. Risk Cop is the only node with a feedback edge, back to the
Architect, on a risk-gate breach (see risk_cop.py for the retry cap).
"""

from __future__ import annotations

from langgraph.graph import END, StateGraph

from cip.agents.backtest_engine import backtest_engine_node
from cip.agents.market_scout import market_scout_node
from cip.agents.risk_cop import risk_cop_node, risk_gate_edge
from cip.agents.strategy_architect import strategy_architect_node
from cip.state import PipelineState


def build_graph():
    graph = StateGraph(PipelineState)
    graph.add_node("market_scout", market_scout_node)
    graph.add_node("strategy_architect", strategy_architect_node)
    graph.add_node("backtest_engine", backtest_engine_node)
    graph.add_node("risk_cop", risk_cop_node)

    graph.set_entry_point("market_scout")
    graph.add_edge("market_scout", "strategy_architect")
    graph.add_edge("strategy_architect", "backtest_engine")
    graph.add_edge("backtest_engine", "risk_cop")
    graph.add_conditional_edges(
        "risk_cop",
        risk_gate_edge,
        {
            "approved": END,
            "rejected": END,
            "corrected": "strategy_architect",
        },
    )
    return graph.compile()
