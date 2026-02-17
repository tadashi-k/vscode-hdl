// Generated from grammar/Verilog.g4 by ANTLR 4.9.0-SNAPSHOT


import { ParseTreeListener } from "antlr4ts/tree/ParseTreeListener";

import { Source_textContext } from "./VerilogParser";
import { DescriptionContext } from "./VerilogParser";
import { Module_declarationContext } from "./VerilogParser";
import { Module_identifierContext } from "./VerilogParser";
import { List_of_portsContext } from "./VerilogParser";
import { PortContext } from "./VerilogParser";
import { Port_expressionContext } from "./VerilogParser";
import { Port_referenceContext } from "./VerilogParser";
import { Port_identifierContext } from "./VerilogParser";
import { Ansi_port_declarationContext } from "./VerilogParser";
import { Input_declaration_ansiContext } from "./VerilogParser";
import { Output_declaration_ansiContext } from "./VerilogParser";
import { Inout_declaration_ansiContext } from "./VerilogParser";
import { Constant_range_expressionContext } from "./VerilogParser";
import { Module_itemContext } from "./VerilogParser";
import { Port_declarationContext } from "./VerilogParser";
import { Input_declarationContext } from "./VerilogParser";
import { Output_declarationContext } from "./VerilogParser";
import { Inout_declarationContext } from "./VerilogParser";
import { Net_declarationContext } from "./VerilogParser";
import { Reg_declarationContext } from "./VerilogParser";
import { Net_typeContext } from "./VerilogParser";
import { RangeContext } from "./VerilogParser";
import { List_of_port_identifiersContext } from "./VerilogParser";
import { List_of_net_identifiersContext } from "./VerilogParser";
import { List_of_register_identifiersContext } from "./VerilogParser";
import { Net_identifierContext } from "./VerilogParser";
import { Register_identifierContext } from "./VerilogParser";
import { Parameter_declarationContext } from "./VerilogParser";
import { List_of_param_assignmentsContext } from "./VerilogParser";
import { Param_assignmentContext } from "./VerilogParser";
import { Parameter_identifierContext } from "./VerilogParser";
import { Continuous_assignContext } from "./VerilogParser";
import { List_of_net_assignmentsContext } from "./VerilogParser";
import { Net_assignmentContext } from "./VerilogParser";
import { Initial_constructContext } from "./VerilogParser";
import { Always_constructContext } from "./VerilogParser";
import { Event_expressionContext } from "./VerilogParser";
import { StatementContext } from "./VerilogParser";
import { Seq_blockContext } from "./VerilogParser";
import { Blocking_assignmentContext } from "./VerilogParser";
import { Non_blocking_assignmentContext } from "./VerilogParser";
import { Conditional_statementContext } from "./VerilogParser";
import { Case_statementContext } from "./VerilogParser";
import { Case_itemContext } from "./VerilogParser";
import { Net_lvalueContext } from "./VerilogParser";
import { Variable_lvalueContext } from "./VerilogParser";
import { Constant_expressionContext } from "./VerilogParser";
import { ExpressionContext } from "./VerilogParser";
import { PrimaryContext } from "./VerilogParser";
import { ConcatenationContext } from "./VerilogParser";
import { Multiple_concatenationContext } from "./VerilogParser";
import { Unary_operatorContext } from "./VerilogParser";
import { Binary_operatorContext } from "./VerilogParser";


/**
 * This interface defines a complete listener for a parse tree produced by
 * `VerilogParser`.
 */
export interface VerilogListener extends ParseTreeListener {
	/**
	 * Enter a parse tree produced by `VerilogParser.source_text`.
	 * @param ctx the parse tree
	 */
	enterSource_text?: (ctx: Source_textContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.source_text`.
	 * @param ctx the parse tree
	 */
	exitSource_text?: (ctx: Source_textContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.description`.
	 * @param ctx the parse tree
	 */
	enterDescription?: (ctx: DescriptionContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.description`.
	 * @param ctx the parse tree
	 */
	exitDescription?: (ctx: DescriptionContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.module_declaration`.
	 * @param ctx the parse tree
	 */
	enterModule_declaration?: (ctx: Module_declarationContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.module_declaration`.
	 * @param ctx the parse tree
	 */
	exitModule_declaration?: (ctx: Module_declarationContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.module_identifier`.
	 * @param ctx the parse tree
	 */
	enterModule_identifier?: (ctx: Module_identifierContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.module_identifier`.
	 * @param ctx the parse tree
	 */
	exitModule_identifier?: (ctx: Module_identifierContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.list_of_ports`.
	 * @param ctx the parse tree
	 */
	enterList_of_ports?: (ctx: List_of_portsContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.list_of_ports`.
	 * @param ctx the parse tree
	 */
	exitList_of_ports?: (ctx: List_of_portsContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.port`.
	 * @param ctx the parse tree
	 */
	enterPort?: (ctx: PortContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.port`.
	 * @param ctx the parse tree
	 */
	exitPort?: (ctx: PortContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.port_expression`.
	 * @param ctx the parse tree
	 */
	enterPort_expression?: (ctx: Port_expressionContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.port_expression`.
	 * @param ctx the parse tree
	 */
	exitPort_expression?: (ctx: Port_expressionContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.port_reference`.
	 * @param ctx the parse tree
	 */
	enterPort_reference?: (ctx: Port_referenceContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.port_reference`.
	 * @param ctx the parse tree
	 */
	exitPort_reference?: (ctx: Port_referenceContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.port_identifier`.
	 * @param ctx the parse tree
	 */
	enterPort_identifier?: (ctx: Port_identifierContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.port_identifier`.
	 * @param ctx the parse tree
	 */
	exitPort_identifier?: (ctx: Port_identifierContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.ansi_port_declaration`.
	 * @param ctx the parse tree
	 */
	enterAnsi_port_declaration?: (ctx: Ansi_port_declarationContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.ansi_port_declaration`.
	 * @param ctx the parse tree
	 */
	exitAnsi_port_declaration?: (ctx: Ansi_port_declarationContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.input_declaration_ansi`.
	 * @param ctx the parse tree
	 */
	enterInput_declaration_ansi?: (ctx: Input_declaration_ansiContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.input_declaration_ansi`.
	 * @param ctx the parse tree
	 */
	exitInput_declaration_ansi?: (ctx: Input_declaration_ansiContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.output_declaration_ansi`.
	 * @param ctx the parse tree
	 */
	enterOutput_declaration_ansi?: (ctx: Output_declaration_ansiContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.output_declaration_ansi`.
	 * @param ctx the parse tree
	 */
	exitOutput_declaration_ansi?: (ctx: Output_declaration_ansiContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.inout_declaration_ansi`.
	 * @param ctx the parse tree
	 */
	enterInout_declaration_ansi?: (ctx: Inout_declaration_ansiContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.inout_declaration_ansi`.
	 * @param ctx the parse tree
	 */
	exitInout_declaration_ansi?: (ctx: Inout_declaration_ansiContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.constant_range_expression`.
	 * @param ctx the parse tree
	 */
	enterConstant_range_expression?: (ctx: Constant_range_expressionContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.constant_range_expression`.
	 * @param ctx the parse tree
	 */
	exitConstant_range_expression?: (ctx: Constant_range_expressionContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.module_item`.
	 * @param ctx the parse tree
	 */
	enterModule_item?: (ctx: Module_itemContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.module_item`.
	 * @param ctx the parse tree
	 */
	exitModule_item?: (ctx: Module_itemContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.port_declaration`.
	 * @param ctx the parse tree
	 */
	enterPort_declaration?: (ctx: Port_declarationContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.port_declaration`.
	 * @param ctx the parse tree
	 */
	exitPort_declaration?: (ctx: Port_declarationContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.input_declaration`.
	 * @param ctx the parse tree
	 */
	enterInput_declaration?: (ctx: Input_declarationContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.input_declaration`.
	 * @param ctx the parse tree
	 */
	exitInput_declaration?: (ctx: Input_declarationContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.output_declaration`.
	 * @param ctx the parse tree
	 */
	enterOutput_declaration?: (ctx: Output_declarationContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.output_declaration`.
	 * @param ctx the parse tree
	 */
	exitOutput_declaration?: (ctx: Output_declarationContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.inout_declaration`.
	 * @param ctx the parse tree
	 */
	enterInout_declaration?: (ctx: Inout_declarationContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.inout_declaration`.
	 * @param ctx the parse tree
	 */
	exitInout_declaration?: (ctx: Inout_declarationContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.net_declaration`.
	 * @param ctx the parse tree
	 */
	enterNet_declaration?: (ctx: Net_declarationContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.net_declaration`.
	 * @param ctx the parse tree
	 */
	exitNet_declaration?: (ctx: Net_declarationContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.reg_declaration`.
	 * @param ctx the parse tree
	 */
	enterReg_declaration?: (ctx: Reg_declarationContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.reg_declaration`.
	 * @param ctx the parse tree
	 */
	exitReg_declaration?: (ctx: Reg_declarationContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.net_type`.
	 * @param ctx the parse tree
	 */
	enterNet_type?: (ctx: Net_typeContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.net_type`.
	 * @param ctx the parse tree
	 */
	exitNet_type?: (ctx: Net_typeContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.range`.
	 * @param ctx the parse tree
	 */
	enterRange?: (ctx: RangeContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.range`.
	 * @param ctx the parse tree
	 */
	exitRange?: (ctx: RangeContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.list_of_port_identifiers`.
	 * @param ctx the parse tree
	 */
	enterList_of_port_identifiers?: (ctx: List_of_port_identifiersContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.list_of_port_identifiers`.
	 * @param ctx the parse tree
	 */
	exitList_of_port_identifiers?: (ctx: List_of_port_identifiersContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.list_of_net_identifiers`.
	 * @param ctx the parse tree
	 */
	enterList_of_net_identifiers?: (ctx: List_of_net_identifiersContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.list_of_net_identifiers`.
	 * @param ctx the parse tree
	 */
	exitList_of_net_identifiers?: (ctx: List_of_net_identifiersContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.list_of_register_identifiers`.
	 * @param ctx the parse tree
	 */
	enterList_of_register_identifiers?: (ctx: List_of_register_identifiersContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.list_of_register_identifiers`.
	 * @param ctx the parse tree
	 */
	exitList_of_register_identifiers?: (ctx: List_of_register_identifiersContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.net_identifier`.
	 * @param ctx the parse tree
	 */
	enterNet_identifier?: (ctx: Net_identifierContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.net_identifier`.
	 * @param ctx the parse tree
	 */
	exitNet_identifier?: (ctx: Net_identifierContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.register_identifier`.
	 * @param ctx the parse tree
	 */
	enterRegister_identifier?: (ctx: Register_identifierContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.register_identifier`.
	 * @param ctx the parse tree
	 */
	exitRegister_identifier?: (ctx: Register_identifierContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.parameter_declaration`.
	 * @param ctx the parse tree
	 */
	enterParameter_declaration?: (ctx: Parameter_declarationContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.parameter_declaration`.
	 * @param ctx the parse tree
	 */
	exitParameter_declaration?: (ctx: Parameter_declarationContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.list_of_param_assignments`.
	 * @param ctx the parse tree
	 */
	enterList_of_param_assignments?: (ctx: List_of_param_assignmentsContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.list_of_param_assignments`.
	 * @param ctx the parse tree
	 */
	exitList_of_param_assignments?: (ctx: List_of_param_assignmentsContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.param_assignment`.
	 * @param ctx the parse tree
	 */
	enterParam_assignment?: (ctx: Param_assignmentContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.param_assignment`.
	 * @param ctx the parse tree
	 */
	exitParam_assignment?: (ctx: Param_assignmentContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.parameter_identifier`.
	 * @param ctx the parse tree
	 */
	enterParameter_identifier?: (ctx: Parameter_identifierContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.parameter_identifier`.
	 * @param ctx the parse tree
	 */
	exitParameter_identifier?: (ctx: Parameter_identifierContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.continuous_assign`.
	 * @param ctx the parse tree
	 */
	enterContinuous_assign?: (ctx: Continuous_assignContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.continuous_assign`.
	 * @param ctx the parse tree
	 */
	exitContinuous_assign?: (ctx: Continuous_assignContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.list_of_net_assignments`.
	 * @param ctx the parse tree
	 */
	enterList_of_net_assignments?: (ctx: List_of_net_assignmentsContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.list_of_net_assignments`.
	 * @param ctx the parse tree
	 */
	exitList_of_net_assignments?: (ctx: List_of_net_assignmentsContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.net_assignment`.
	 * @param ctx the parse tree
	 */
	enterNet_assignment?: (ctx: Net_assignmentContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.net_assignment`.
	 * @param ctx the parse tree
	 */
	exitNet_assignment?: (ctx: Net_assignmentContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.initial_construct`.
	 * @param ctx the parse tree
	 */
	enterInitial_construct?: (ctx: Initial_constructContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.initial_construct`.
	 * @param ctx the parse tree
	 */
	exitInitial_construct?: (ctx: Initial_constructContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.always_construct`.
	 * @param ctx the parse tree
	 */
	enterAlways_construct?: (ctx: Always_constructContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.always_construct`.
	 * @param ctx the parse tree
	 */
	exitAlways_construct?: (ctx: Always_constructContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.event_expression`.
	 * @param ctx the parse tree
	 */
	enterEvent_expression?: (ctx: Event_expressionContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.event_expression`.
	 * @param ctx the parse tree
	 */
	exitEvent_expression?: (ctx: Event_expressionContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.statement`.
	 * @param ctx the parse tree
	 */
	enterStatement?: (ctx: StatementContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.statement`.
	 * @param ctx the parse tree
	 */
	exitStatement?: (ctx: StatementContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.seq_block`.
	 * @param ctx the parse tree
	 */
	enterSeq_block?: (ctx: Seq_blockContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.seq_block`.
	 * @param ctx the parse tree
	 */
	exitSeq_block?: (ctx: Seq_blockContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.blocking_assignment`.
	 * @param ctx the parse tree
	 */
	enterBlocking_assignment?: (ctx: Blocking_assignmentContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.blocking_assignment`.
	 * @param ctx the parse tree
	 */
	exitBlocking_assignment?: (ctx: Blocking_assignmentContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.non_blocking_assignment`.
	 * @param ctx the parse tree
	 */
	enterNon_blocking_assignment?: (ctx: Non_blocking_assignmentContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.non_blocking_assignment`.
	 * @param ctx the parse tree
	 */
	exitNon_blocking_assignment?: (ctx: Non_blocking_assignmentContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.conditional_statement`.
	 * @param ctx the parse tree
	 */
	enterConditional_statement?: (ctx: Conditional_statementContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.conditional_statement`.
	 * @param ctx the parse tree
	 */
	exitConditional_statement?: (ctx: Conditional_statementContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.case_statement`.
	 * @param ctx the parse tree
	 */
	enterCase_statement?: (ctx: Case_statementContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.case_statement`.
	 * @param ctx the parse tree
	 */
	exitCase_statement?: (ctx: Case_statementContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.case_item`.
	 * @param ctx the parse tree
	 */
	enterCase_item?: (ctx: Case_itemContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.case_item`.
	 * @param ctx the parse tree
	 */
	exitCase_item?: (ctx: Case_itemContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.net_lvalue`.
	 * @param ctx the parse tree
	 */
	enterNet_lvalue?: (ctx: Net_lvalueContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.net_lvalue`.
	 * @param ctx the parse tree
	 */
	exitNet_lvalue?: (ctx: Net_lvalueContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.variable_lvalue`.
	 * @param ctx the parse tree
	 */
	enterVariable_lvalue?: (ctx: Variable_lvalueContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.variable_lvalue`.
	 * @param ctx the parse tree
	 */
	exitVariable_lvalue?: (ctx: Variable_lvalueContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.constant_expression`.
	 * @param ctx the parse tree
	 */
	enterConstant_expression?: (ctx: Constant_expressionContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.constant_expression`.
	 * @param ctx the parse tree
	 */
	exitConstant_expression?: (ctx: Constant_expressionContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression?: (ctx: ExpressionContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression?: (ctx: ExpressionContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.primary`.
	 * @param ctx the parse tree
	 */
	enterPrimary?: (ctx: PrimaryContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.primary`.
	 * @param ctx the parse tree
	 */
	exitPrimary?: (ctx: PrimaryContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.concatenation`.
	 * @param ctx the parse tree
	 */
	enterConcatenation?: (ctx: ConcatenationContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.concatenation`.
	 * @param ctx the parse tree
	 */
	exitConcatenation?: (ctx: ConcatenationContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.multiple_concatenation`.
	 * @param ctx the parse tree
	 */
	enterMultiple_concatenation?: (ctx: Multiple_concatenationContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.multiple_concatenation`.
	 * @param ctx the parse tree
	 */
	exitMultiple_concatenation?: (ctx: Multiple_concatenationContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.unary_operator`.
	 * @param ctx the parse tree
	 */
	enterUnary_operator?: (ctx: Unary_operatorContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.unary_operator`.
	 * @param ctx the parse tree
	 */
	exitUnary_operator?: (ctx: Unary_operatorContext) => void;

	/**
	 * Enter a parse tree produced by `VerilogParser.binary_operator`.
	 * @param ctx the parse tree
	 */
	enterBinary_operator?: (ctx: Binary_operatorContext) => void;
	/**
	 * Exit a parse tree produced by `VerilogParser.binary_operator`.
	 * @param ctx the parse tree
	 */
	exitBinary_operator?: (ctx: Binary_operatorContext) => void;
}

