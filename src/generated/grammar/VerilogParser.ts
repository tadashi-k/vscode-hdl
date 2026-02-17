// Generated from grammar/Verilog.g4 by ANTLR 4.9.0-SNAPSHOT


import { ATN } from "antlr4ts/atn/ATN";
import { ATNDeserializer } from "antlr4ts/atn/ATNDeserializer";
import { FailedPredicateException } from "antlr4ts/FailedPredicateException";
import { NotNull } from "antlr4ts/Decorators";
import { NoViableAltException } from "antlr4ts/NoViableAltException";
import { Override } from "antlr4ts/Decorators";
import { Parser } from "antlr4ts/Parser";
import { ParserRuleContext } from "antlr4ts/ParserRuleContext";
import { ParserATNSimulator } from "antlr4ts/atn/ParserATNSimulator";
import { ParseTreeListener } from "antlr4ts/tree/ParseTreeListener";
import { ParseTreeVisitor } from "antlr4ts/tree/ParseTreeVisitor";
import { RecognitionException } from "antlr4ts/RecognitionException";
import { RuleContext } from "antlr4ts/RuleContext";
//import { RuleVersion } from "antlr4ts/RuleVersion";
import { TerminalNode } from "antlr4ts/tree/TerminalNode";
import { Token } from "antlr4ts/Token";
import { TokenStream } from "antlr4ts/TokenStream";
import { Vocabulary } from "antlr4ts/Vocabulary";
import { VocabularyImpl } from "antlr4ts/VocabularyImpl";

import * as Utils from "antlr4ts/misc/Utils";

import { VerilogListener } from "./VerilogListener";

export class VerilogParser extends Parser {
	public static readonly T__0 = 1;
	public static readonly T__1 = 2;
	public static readonly T__2 = 3;
	public static readonly T__3 = 4;
	public static readonly T__4 = 5;
	public static readonly T__5 = 6;
	public static readonly T__6 = 7;
	public static readonly T__7 = 8;
	public static readonly T__8 = 9;
	public static readonly T__9 = 10;
	public static readonly T__10 = 11;
	public static readonly T__11 = 12;
	public static readonly T__12 = 13;
	public static readonly T__13 = 14;
	public static readonly T__14 = 15;
	public static readonly T__15 = 16;
	public static readonly T__16 = 17;
	public static readonly T__17 = 18;
	public static readonly T__18 = 19;
	public static readonly T__19 = 20;
	public static readonly T__20 = 21;
	public static readonly T__21 = 22;
	public static readonly T__22 = 23;
	public static readonly T__23 = 24;
	public static readonly T__24 = 25;
	public static readonly T__25 = 26;
	public static readonly T__26 = 27;
	public static readonly T__27 = 28;
	public static readonly T__28 = 29;
	public static readonly T__29 = 30;
	public static readonly T__30 = 31;
	public static readonly T__31 = 32;
	public static readonly T__32 = 33;
	public static readonly T__33 = 34;
	public static readonly T__34 = 35;
	public static readonly T__35 = 36;
	public static readonly T__36 = 37;
	public static readonly T__37 = 38;
	public static readonly T__38 = 39;
	public static readonly T__39 = 40;
	public static readonly T__40 = 41;
	public static readonly T__41 = 42;
	public static readonly T__42 = 43;
	public static readonly T__43 = 44;
	public static readonly T__44 = 45;
	public static readonly T__45 = 46;
	public static readonly T__46 = 47;
	public static readonly T__47 = 48;
	public static readonly T__48 = 49;
	public static readonly T__49 = 50;
	public static readonly T__50 = 51;
	public static readonly T__51 = 52;
	public static readonly T__52 = 53;
	public static readonly T__53 = 54;
	public static readonly T__54 = 55;
	public static readonly T__55 = 56;
	public static readonly T__56 = 57;
	public static readonly T__57 = 58;
	public static readonly T__58 = 59;
	public static readonly T__59 = 60;
	public static readonly T__60 = 61;
	public static readonly IDENTIFIER = 62;
	public static readonly NUMBER = 63;
	public static readonly DECIMAL_NUMBER = 64;
	public static readonly BASED_NUMBER = 65;
	public static readonly WHITESPACE = 66;
	public static readonly COMMENT = 67;
	public static readonly BLOCK_COMMENT = 68;
	public static readonly RULE_source_text = 0;
	public static readonly RULE_description = 1;
	public static readonly RULE_module_declaration = 2;
	public static readonly RULE_module_identifier = 3;
	public static readonly RULE_list_of_ports = 4;
	public static readonly RULE_port = 5;
	public static readonly RULE_port_expression = 6;
	public static readonly RULE_port_reference = 7;
	public static readonly RULE_port_identifier = 8;
	public static readonly RULE_ansi_port_declaration = 9;
	public static readonly RULE_input_declaration_ansi = 10;
	public static readonly RULE_output_declaration_ansi = 11;
	public static readonly RULE_inout_declaration_ansi = 12;
	public static readonly RULE_constant_range_expression = 13;
	public static readonly RULE_module_item = 14;
	public static readonly RULE_port_declaration = 15;
	public static readonly RULE_input_declaration = 16;
	public static readonly RULE_output_declaration = 17;
	public static readonly RULE_inout_declaration = 18;
	public static readonly RULE_net_declaration = 19;
	public static readonly RULE_reg_declaration = 20;
	public static readonly RULE_net_type = 21;
	public static readonly RULE_range = 22;
	public static readonly RULE_list_of_port_identifiers = 23;
	public static readonly RULE_list_of_net_identifiers = 24;
	public static readonly RULE_list_of_register_identifiers = 25;
	public static readonly RULE_net_identifier = 26;
	public static readonly RULE_register_identifier = 27;
	public static readonly RULE_parameter_declaration = 28;
	public static readonly RULE_list_of_param_assignments = 29;
	public static readonly RULE_param_assignment = 30;
	public static readonly RULE_parameter_identifier = 31;
	public static readonly RULE_continuous_assign = 32;
	public static readonly RULE_list_of_net_assignments = 33;
	public static readonly RULE_net_assignment = 34;
	public static readonly RULE_initial_construct = 35;
	public static readonly RULE_always_construct = 36;
	public static readonly RULE_event_expression = 37;
	public static readonly RULE_statement = 38;
	public static readonly RULE_seq_block = 39;
	public static readonly RULE_blocking_assignment = 40;
	public static readonly RULE_non_blocking_assignment = 41;
	public static readonly RULE_conditional_statement = 42;
	public static readonly RULE_case_statement = 43;
	public static readonly RULE_case_item = 44;
	public static readonly RULE_net_lvalue = 45;
	public static readonly RULE_variable_lvalue = 46;
	public static readonly RULE_constant_expression = 47;
	public static readonly RULE_expression = 48;
	public static readonly RULE_primary = 49;
	public static readonly RULE_concatenation = 50;
	public static readonly RULE_multiple_concatenation = 51;
	public static readonly RULE_unary_operator = 52;
	public static readonly RULE_binary_operator = 53;
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"source_text", "description", "module_declaration", "module_identifier", 
		"list_of_ports", "port", "port_expression", "port_reference", "port_identifier", 
		"ansi_port_declaration", "input_declaration_ansi", "output_declaration_ansi", 
		"inout_declaration_ansi", "constant_range_expression", "module_item", 
		"port_declaration", "input_declaration", "output_declaration", "inout_declaration", 
		"net_declaration", "reg_declaration", "net_type", "range", "list_of_port_identifiers", 
		"list_of_net_identifiers", "list_of_register_identifiers", "net_identifier", 
		"register_identifier", "parameter_declaration", "list_of_param_assignments", 
		"param_assignment", "parameter_identifier", "continuous_assign", "list_of_net_assignments", 
		"net_assignment", "initial_construct", "always_construct", "event_expression", 
		"statement", "seq_block", "blocking_assignment", "non_blocking_assignment", 
		"conditional_statement", "case_statement", "case_item", "net_lvalue", 
		"variable_lvalue", "constant_expression", "expression", "primary", "concatenation", 
		"multiple_concatenation", "unary_operator", "binary_operator",
	];

	private static readonly _LITERAL_NAMES: Array<string | undefined> = [
		undefined, "'module'", "';'", "'endmodule'", "'('", "','", "')'", "'.'", 
		"'{'", "'}'", "'input'", "'output'", "'reg'", "'inout'", "':'", "'wire'", 
		"'tri'", "'supply0'", "'supply1'", "'['", "']'", "'parameter'", "'='", 
		"'assign'", "'initial'", "'always'", "'@'", "'posedge'", "'negedge'", 
		"'or'", "'begin'", "'end'", "'<='", "'if'", "'else'", "'case'", "'endcase'", 
		"'default'", "'?'", "'+'", "'-'", "'!'", "'~'", "'&'", "'|'", "'^'", "'*'", 
		"'/'", "'%'", "'=='", "'!='", "'==='", "'!=='", "'&&'", "'||'", "'<'", 
		"'>'", "'>='", "'~^'", "'^~'", "'<<'", "'>>'",
	];
	private static readonly _SYMBOLIC_NAMES: Array<string | undefined> = [
		undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
		undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
		undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
		undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
		undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
		undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
		undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
		undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
		undefined, undefined, undefined, undefined, undefined, undefined, "IDENTIFIER", 
		"NUMBER", "DECIMAL_NUMBER", "BASED_NUMBER", "WHITESPACE", "COMMENT", "BLOCK_COMMENT",
	];
	public static readonly VOCABULARY: Vocabulary = new VocabularyImpl(VerilogParser._LITERAL_NAMES, VerilogParser._SYMBOLIC_NAMES, []);

	// @Override
	// @NotNull
	public get vocabulary(): Vocabulary {
		return VerilogParser.VOCABULARY;
	}
	// tslint:enable:no-trailing-whitespace

	// @Override
	public get grammarFileName(): string { return "Verilog.g4"; }

	// @Override
	public get ruleNames(): string[] { return VerilogParser.ruleNames; }

	// @Override
	public get serializedATN(): string { return VerilogParser._serializedATN; }

	protected createFailedPredicateException(predicate?: string, message?: string): FailedPredicateException {
		return new FailedPredicateException(this, predicate, message);
	}

	constructor(input: TokenStream) {
		super(input);
		this._interp = new ParserATNSimulator(VerilogParser._ATN, this);
	}
	// @RuleVersion(0)
	public source_text(): Source_textContext {
		let _localctx: Source_textContext = new Source_textContext(this._ctx, this.state);
		this.enterRule(_localctx, 0, VerilogParser.RULE_source_text);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 111;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la === VerilogParser.T__0) {
				{
				{
				this.state = 108;
				this.description();
				}
				}
				this.state = 113;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			this.state = 114;
			this.match(VerilogParser.EOF);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public description(): DescriptionContext {
		let _localctx: DescriptionContext = new DescriptionContext(this._ctx, this.state);
		this.enterRule(_localctx, 2, VerilogParser.RULE_description);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 116;
			this.module_declaration();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public module_declaration(): Module_declarationContext {
		let _localctx: Module_declarationContext = new Module_declarationContext(this._ctx, this.state);
		this.enterRule(_localctx, 4, VerilogParser.RULE_module_declaration);
		let _la: number;
		try {
			this.state = 166;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 6, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 118;
				this.match(VerilogParser.T__0);
				this.state = 119;
				this.module_identifier();
				this.state = 121;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la === VerilogParser.T__3) {
					{
					this.state = 120;
					this.list_of_ports();
					}
				}

				this.state = 123;
				this.match(VerilogParser.T__1);
				this.state = 127;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while ((((_la) & ~0x1F) === 0 && ((1 << _la) & ((1 << VerilogParser.T__9) | (1 << VerilogParser.T__10) | (1 << VerilogParser.T__11) | (1 << VerilogParser.T__12) | (1 << VerilogParser.T__14) | (1 << VerilogParser.T__15) | (1 << VerilogParser.T__16) | (1 << VerilogParser.T__17) | (1 << VerilogParser.T__20) | (1 << VerilogParser.T__22) | (1 << VerilogParser.T__23) | (1 << VerilogParser.T__24))) !== 0)) {
					{
					{
					this.state = 124;
					this.module_item();
					}
					}
					this.state = 129;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 130;
				this.match(VerilogParser.T__2);
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 132;
				this.match(VerilogParser.T__0);
				this.state = 133;
				this.module_identifier();
				this.state = 134;
				this.match(VerilogParser.T__3);
				this.state = 135;
				this.ansi_port_declaration();
				this.state = 140;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === VerilogParser.T__4) {
					{
					{
					this.state = 136;
					this.match(VerilogParser.T__4);
					this.state = 137;
					this.ansi_port_declaration();
					}
					}
					this.state = 142;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 143;
				this.match(VerilogParser.T__5);
				this.state = 144;
				this.match(VerilogParser.T__1);
				this.state = 148;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while ((((_la) & ~0x1F) === 0 && ((1 << _la) & ((1 << VerilogParser.T__9) | (1 << VerilogParser.T__10) | (1 << VerilogParser.T__11) | (1 << VerilogParser.T__12) | (1 << VerilogParser.T__14) | (1 << VerilogParser.T__15) | (1 << VerilogParser.T__16) | (1 << VerilogParser.T__17) | (1 << VerilogParser.T__20) | (1 << VerilogParser.T__22) | (1 << VerilogParser.T__23) | (1 << VerilogParser.T__24))) !== 0)) {
					{
					{
					this.state = 145;
					this.module_item();
					}
					}
					this.state = 150;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 151;
				this.match(VerilogParser.T__2);
				}
				break;

			case 3:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 153;
				this.match(VerilogParser.T__0);
				this.state = 154;
				this.module_identifier();
				this.state = 155;
				this.match(VerilogParser.T__3);
				this.state = 156;
				this.match(VerilogParser.T__5);
				this.state = 157;
				this.match(VerilogParser.T__1);
				this.state = 161;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while ((((_la) & ~0x1F) === 0 && ((1 << _la) & ((1 << VerilogParser.T__9) | (1 << VerilogParser.T__10) | (1 << VerilogParser.T__11) | (1 << VerilogParser.T__12) | (1 << VerilogParser.T__14) | (1 << VerilogParser.T__15) | (1 << VerilogParser.T__16) | (1 << VerilogParser.T__17) | (1 << VerilogParser.T__20) | (1 << VerilogParser.T__22) | (1 << VerilogParser.T__23) | (1 << VerilogParser.T__24))) !== 0)) {
					{
					{
					this.state = 158;
					this.module_item();
					}
					}
					this.state = 163;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 164;
				this.match(VerilogParser.T__2);
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public module_identifier(): Module_identifierContext {
		let _localctx: Module_identifierContext = new Module_identifierContext(this._ctx, this.state);
		this.enterRule(_localctx, 6, VerilogParser.RULE_module_identifier);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 168;
			this.match(VerilogParser.IDENTIFIER);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public list_of_ports(): List_of_portsContext {
		let _localctx: List_of_portsContext = new List_of_portsContext(this._ctx, this.state);
		this.enterRule(_localctx, 8, VerilogParser.RULE_list_of_ports);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 170;
			this.match(VerilogParser.T__3);
			this.state = 171;
			this.port();
			this.state = 176;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la === VerilogParser.T__4) {
				{
				{
				this.state = 172;
				this.match(VerilogParser.T__4);
				this.state = 173;
				this.port();
				}
				}
				this.state = 178;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			this.state = 179;
			this.match(VerilogParser.T__5);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public port(): PortContext {
		let _localctx: PortContext = new PortContext(this._ctx, this.state);
		this.enterRule(_localctx, 10, VerilogParser.RULE_port);
		let _la: number;
		try {
			this.state = 192;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case VerilogParser.T__4:
			case VerilogParser.T__5:
			case VerilogParser.T__7:
			case VerilogParser.IDENTIFIER:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 182;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la === VerilogParser.T__7 || _la === VerilogParser.IDENTIFIER) {
					{
					this.state = 181;
					this.port_expression();
					}
				}

				}
				break;
			case VerilogParser.T__6:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 184;
				this.match(VerilogParser.T__6);
				this.state = 185;
				this.port_identifier();
				this.state = 186;
				this.match(VerilogParser.T__3);
				this.state = 188;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la === VerilogParser.T__7 || _la === VerilogParser.IDENTIFIER) {
					{
					this.state = 187;
					this.port_expression();
					}
				}

				this.state = 190;
				this.match(VerilogParser.T__5);
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public port_expression(): Port_expressionContext {
		let _localctx: Port_expressionContext = new Port_expressionContext(this._ctx, this.state);
		this.enterRule(_localctx, 12, VerilogParser.RULE_port_expression);
		let _la: number;
		try {
			this.state = 206;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case VerilogParser.IDENTIFIER:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 194;
				this.port_reference();
				}
				break;
			case VerilogParser.T__7:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 195;
				this.match(VerilogParser.T__7);
				this.state = 196;
				this.port_reference();
				this.state = 201;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === VerilogParser.T__4) {
					{
					{
					this.state = 197;
					this.match(VerilogParser.T__4);
					this.state = 198;
					this.port_reference();
					}
					}
					this.state = 203;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 204;
				this.match(VerilogParser.T__8);
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public port_reference(): Port_referenceContext {
		let _localctx: Port_referenceContext = new Port_referenceContext(this._ctx, this.state);
		this.enterRule(_localctx, 14, VerilogParser.RULE_port_reference);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 208;
			this.port_identifier();
			this.state = 210;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === VerilogParser.T__3 || _la === VerilogParser.T__7 || ((((_la - 39)) & ~0x1F) === 0 && ((1 << (_la - 39)) & ((1 << (VerilogParser.T__38 - 39)) | (1 << (VerilogParser.T__39 - 39)) | (1 << (VerilogParser.T__40 - 39)) | (1 << (VerilogParser.T__41 - 39)) | (1 << (VerilogParser.T__42 - 39)) | (1 << (VerilogParser.T__43 - 39)) | (1 << (VerilogParser.T__44 - 39)) | (1 << (VerilogParser.IDENTIFIER - 39)) | (1 << (VerilogParser.NUMBER - 39)))) !== 0)) {
				{
				this.state = 209;
				this.constant_range_expression();
				}
			}

			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public port_identifier(): Port_identifierContext {
		let _localctx: Port_identifierContext = new Port_identifierContext(this._ctx, this.state);
		this.enterRule(_localctx, 16, VerilogParser.RULE_port_identifier);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 212;
			this.match(VerilogParser.IDENTIFIER);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public ansi_port_declaration(): Ansi_port_declarationContext {
		let _localctx: Ansi_port_declarationContext = new Ansi_port_declarationContext(this._ctx, this.state);
		this.enterRule(_localctx, 18, VerilogParser.RULE_ansi_port_declaration);
		try {
			this.state = 217;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case VerilogParser.T__9:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 214;
				this.input_declaration_ansi();
				}
				break;
			case VerilogParser.T__10:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 215;
				this.output_declaration_ansi();
				}
				break;
			case VerilogParser.T__12:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 216;
				this.inout_declaration_ansi();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public input_declaration_ansi(): Input_declaration_ansiContext {
		let _localctx: Input_declaration_ansiContext = new Input_declaration_ansiContext(this._ctx, this.state);
		this.enterRule(_localctx, 20, VerilogParser.RULE_input_declaration_ansi);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 219;
			this.match(VerilogParser.T__9);
			this.state = 221;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if ((((_la) & ~0x1F) === 0 && ((1 << _la) & ((1 << VerilogParser.T__14) | (1 << VerilogParser.T__15) | (1 << VerilogParser.T__16) | (1 << VerilogParser.T__17))) !== 0)) {
				{
				this.state = 220;
				this.net_type();
				}
			}

			this.state = 224;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === VerilogParser.T__18) {
				{
				this.state = 223;
				this.range();
				}
			}

			this.state = 226;
			this.port_identifier();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public output_declaration_ansi(): Output_declaration_ansiContext {
		let _localctx: Output_declaration_ansiContext = new Output_declaration_ansiContext(this._ctx, this.state);
		this.enterRule(_localctx, 22, VerilogParser.RULE_output_declaration_ansi);
		let _la: number;
		try {
			this.state = 242;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 20, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 228;
				this.match(VerilogParser.T__10);
				this.state = 230;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if ((((_la) & ~0x1F) === 0 && ((1 << _la) & ((1 << VerilogParser.T__14) | (1 << VerilogParser.T__15) | (1 << VerilogParser.T__16) | (1 << VerilogParser.T__17))) !== 0)) {
					{
					this.state = 229;
					this.net_type();
					}
				}

				this.state = 233;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la === VerilogParser.T__18) {
					{
					this.state = 232;
					this.range();
					}
				}

				this.state = 235;
				this.port_identifier();
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 236;
				this.match(VerilogParser.T__10);
				this.state = 237;
				this.match(VerilogParser.T__11);
				this.state = 239;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la === VerilogParser.T__18) {
					{
					this.state = 238;
					this.range();
					}
				}

				this.state = 241;
				this.port_identifier();
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public inout_declaration_ansi(): Inout_declaration_ansiContext {
		let _localctx: Inout_declaration_ansiContext = new Inout_declaration_ansiContext(this._ctx, this.state);
		this.enterRule(_localctx, 24, VerilogParser.RULE_inout_declaration_ansi);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 244;
			this.match(VerilogParser.T__12);
			this.state = 246;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if ((((_la) & ~0x1F) === 0 && ((1 << _la) & ((1 << VerilogParser.T__14) | (1 << VerilogParser.T__15) | (1 << VerilogParser.T__16) | (1 << VerilogParser.T__17))) !== 0)) {
				{
				this.state = 245;
				this.net_type();
				}
			}

			this.state = 249;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === VerilogParser.T__18) {
				{
				this.state = 248;
				this.range();
				}
			}

			this.state = 251;
			this.port_identifier();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public constant_range_expression(): Constant_range_expressionContext {
		let _localctx: Constant_range_expressionContext = new Constant_range_expressionContext(this._ctx, this.state);
		this.enterRule(_localctx, 26, VerilogParser.RULE_constant_range_expression);
		try {
			this.state = 258;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 23, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 253;
				this.constant_expression();
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 254;
				this.constant_expression();
				this.state = 255;
				this.match(VerilogParser.T__13);
				this.state = 256;
				this.constant_expression();
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public module_item(): Module_itemContext {
		let _localctx: Module_itemContext = new Module_itemContext(this._ctx, this.state);
		this.enterRule(_localctx, 28, VerilogParser.RULE_module_item);
		try {
			this.state = 267;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case VerilogParser.T__9:
			case VerilogParser.T__10:
			case VerilogParser.T__12:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 260;
				this.port_declaration();
				}
				break;
			case VerilogParser.T__14:
			case VerilogParser.T__15:
			case VerilogParser.T__16:
			case VerilogParser.T__17:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 261;
				this.net_declaration();
				}
				break;
			case VerilogParser.T__11:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 262;
				this.reg_declaration();
				}
				break;
			case VerilogParser.T__20:
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 263;
				this.parameter_declaration();
				}
				break;
			case VerilogParser.T__22:
				this.enterOuterAlt(_localctx, 5);
				{
				this.state = 264;
				this.continuous_assign();
				}
				break;
			case VerilogParser.T__23:
				this.enterOuterAlt(_localctx, 6);
				{
				this.state = 265;
				this.initial_construct();
				}
				break;
			case VerilogParser.T__24:
				this.enterOuterAlt(_localctx, 7);
				{
				this.state = 266;
				this.always_construct();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public port_declaration(): Port_declarationContext {
		let _localctx: Port_declarationContext = new Port_declarationContext(this._ctx, this.state);
		this.enterRule(_localctx, 30, VerilogParser.RULE_port_declaration);
		try {
			this.state = 272;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case VerilogParser.T__9:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 269;
				this.input_declaration();
				}
				break;
			case VerilogParser.T__10:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 270;
				this.output_declaration();
				}
				break;
			case VerilogParser.T__12:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 271;
				this.inout_declaration();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public input_declaration(): Input_declarationContext {
		let _localctx: Input_declarationContext = new Input_declarationContext(this._ctx, this.state);
		this.enterRule(_localctx, 32, VerilogParser.RULE_input_declaration);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 274;
			this.match(VerilogParser.T__9);
			this.state = 276;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if ((((_la) & ~0x1F) === 0 && ((1 << _la) & ((1 << VerilogParser.T__14) | (1 << VerilogParser.T__15) | (1 << VerilogParser.T__16) | (1 << VerilogParser.T__17))) !== 0)) {
				{
				this.state = 275;
				this.net_type();
				}
			}

			this.state = 279;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === VerilogParser.T__18) {
				{
				this.state = 278;
				this.range();
				}
			}

			this.state = 281;
			this.list_of_port_identifiers();
			this.state = 282;
			this.match(VerilogParser.T__1);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public output_declaration(): Output_declarationContext {
		let _localctx: Output_declarationContext = new Output_declarationContext(this._ctx, this.state);
		this.enterRule(_localctx, 34, VerilogParser.RULE_output_declaration);
		let _la: number;
		try {
			this.state = 302;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 31, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 284;
				this.match(VerilogParser.T__10);
				this.state = 286;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if ((((_la) & ~0x1F) === 0 && ((1 << _la) & ((1 << VerilogParser.T__14) | (1 << VerilogParser.T__15) | (1 << VerilogParser.T__16) | (1 << VerilogParser.T__17))) !== 0)) {
					{
					this.state = 285;
					this.net_type();
					}
				}

				this.state = 289;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la === VerilogParser.T__18) {
					{
					this.state = 288;
					this.range();
					}
				}

				this.state = 291;
				this.list_of_port_identifiers();
				this.state = 292;
				this.match(VerilogParser.T__1);
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 294;
				this.match(VerilogParser.T__10);
				this.state = 295;
				this.match(VerilogParser.T__11);
				this.state = 297;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la === VerilogParser.T__18) {
					{
					this.state = 296;
					this.range();
					}
				}

				this.state = 299;
				this.list_of_port_identifiers();
				this.state = 300;
				this.match(VerilogParser.T__1);
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public inout_declaration(): Inout_declarationContext {
		let _localctx: Inout_declarationContext = new Inout_declarationContext(this._ctx, this.state);
		this.enterRule(_localctx, 36, VerilogParser.RULE_inout_declaration);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 304;
			this.match(VerilogParser.T__12);
			this.state = 306;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if ((((_la) & ~0x1F) === 0 && ((1 << _la) & ((1 << VerilogParser.T__14) | (1 << VerilogParser.T__15) | (1 << VerilogParser.T__16) | (1 << VerilogParser.T__17))) !== 0)) {
				{
				this.state = 305;
				this.net_type();
				}
			}

			this.state = 309;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === VerilogParser.T__18) {
				{
				this.state = 308;
				this.range();
				}
			}

			this.state = 311;
			this.list_of_port_identifiers();
			this.state = 312;
			this.match(VerilogParser.T__1);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public net_declaration(): Net_declarationContext {
		let _localctx: Net_declarationContext = new Net_declarationContext(this._ctx, this.state);
		this.enterRule(_localctx, 38, VerilogParser.RULE_net_declaration);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 314;
			this.net_type();
			this.state = 316;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === VerilogParser.T__18) {
				{
				this.state = 315;
				this.range();
				}
			}

			this.state = 318;
			this.list_of_net_identifiers();
			this.state = 319;
			this.match(VerilogParser.T__1);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public reg_declaration(): Reg_declarationContext {
		let _localctx: Reg_declarationContext = new Reg_declarationContext(this._ctx, this.state);
		this.enterRule(_localctx, 40, VerilogParser.RULE_reg_declaration);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 321;
			this.match(VerilogParser.T__11);
			this.state = 323;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === VerilogParser.T__18) {
				{
				this.state = 322;
				this.range();
				}
			}

			this.state = 325;
			this.list_of_register_identifiers();
			this.state = 326;
			this.match(VerilogParser.T__1);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public net_type(): Net_typeContext {
		let _localctx: Net_typeContext = new Net_typeContext(this._ctx, this.state);
		this.enterRule(_localctx, 42, VerilogParser.RULE_net_type);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 328;
			_la = this._input.LA(1);
			if (!((((_la) & ~0x1F) === 0 && ((1 << _la) & ((1 << VerilogParser.T__14) | (1 << VerilogParser.T__15) | (1 << VerilogParser.T__16) | (1 << VerilogParser.T__17))) !== 0))) {
			this._errHandler.recoverInline(this);
			} else {
				if (this._input.LA(1) === Token.EOF) {
					this.matchedEOF = true;
				}

				this._errHandler.reportMatch(this);
				this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public range(): RangeContext {
		let _localctx: RangeContext = new RangeContext(this._ctx, this.state);
		this.enterRule(_localctx, 44, VerilogParser.RULE_range);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 330;
			this.match(VerilogParser.T__18);
			this.state = 331;
			this.constant_expression();
			this.state = 332;
			this.match(VerilogParser.T__13);
			this.state = 333;
			this.constant_expression();
			this.state = 334;
			this.match(VerilogParser.T__19);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public list_of_port_identifiers(): List_of_port_identifiersContext {
		let _localctx: List_of_port_identifiersContext = new List_of_port_identifiersContext(this._ctx, this.state);
		this.enterRule(_localctx, 46, VerilogParser.RULE_list_of_port_identifiers);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 336;
			this.port_identifier();
			this.state = 341;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la === VerilogParser.T__4) {
				{
				{
				this.state = 337;
				this.match(VerilogParser.T__4);
				this.state = 338;
				this.port_identifier();
				}
				}
				this.state = 343;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public list_of_net_identifiers(): List_of_net_identifiersContext {
		let _localctx: List_of_net_identifiersContext = new List_of_net_identifiersContext(this._ctx, this.state);
		this.enterRule(_localctx, 48, VerilogParser.RULE_list_of_net_identifiers);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 344;
			this.net_identifier();
			this.state = 349;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la === VerilogParser.T__4) {
				{
				{
				this.state = 345;
				this.match(VerilogParser.T__4);
				this.state = 346;
				this.net_identifier();
				}
				}
				this.state = 351;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public list_of_register_identifiers(): List_of_register_identifiersContext {
		let _localctx: List_of_register_identifiersContext = new List_of_register_identifiersContext(this._ctx, this.state);
		this.enterRule(_localctx, 50, VerilogParser.RULE_list_of_register_identifiers);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 352;
			this.register_identifier();
			this.state = 357;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la === VerilogParser.T__4) {
				{
				{
				this.state = 353;
				this.match(VerilogParser.T__4);
				this.state = 354;
				this.register_identifier();
				}
				}
				this.state = 359;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public net_identifier(): Net_identifierContext {
		let _localctx: Net_identifierContext = new Net_identifierContext(this._ctx, this.state);
		this.enterRule(_localctx, 52, VerilogParser.RULE_net_identifier);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 360;
			this.match(VerilogParser.IDENTIFIER);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public register_identifier(): Register_identifierContext {
		let _localctx: Register_identifierContext = new Register_identifierContext(this._ctx, this.state);
		this.enterRule(_localctx, 54, VerilogParser.RULE_register_identifier);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 362;
			this.match(VerilogParser.IDENTIFIER);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public parameter_declaration(): Parameter_declarationContext {
		let _localctx: Parameter_declarationContext = new Parameter_declarationContext(this._ctx, this.state);
		this.enterRule(_localctx, 56, VerilogParser.RULE_parameter_declaration);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 364;
			this.match(VerilogParser.T__20);
			this.state = 365;
			this.list_of_param_assignments();
			this.state = 366;
			this.match(VerilogParser.T__1);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public list_of_param_assignments(): List_of_param_assignmentsContext {
		let _localctx: List_of_param_assignmentsContext = new List_of_param_assignmentsContext(this._ctx, this.state);
		this.enterRule(_localctx, 58, VerilogParser.RULE_list_of_param_assignments);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 368;
			this.param_assignment();
			this.state = 373;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la === VerilogParser.T__4) {
				{
				{
				this.state = 369;
				this.match(VerilogParser.T__4);
				this.state = 370;
				this.param_assignment();
				}
				}
				this.state = 375;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public param_assignment(): Param_assignmentContext {
		let _localctx: Param_assignmentContext = new Param_assignmentContext(this._ctx, this.state);
		this.enterRule(_localctx, 60, VerilogParser.RULE_param_assignment);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 376;
			this.parameter_identifier();
			this.state = 377;
			this.match(VerilogParser.T__21);
			this.state = 378;
			this.constant_expression();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public parameter_identifier(): Parameter_identifierContext {
		let _localctx: Parameter_identifierContext = new Parameter_identifierContext(this._ctx, this.state);
		this.enterRule(_localctx, 62, VerilogParser.RULE_parameter_identifier);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 380;
			this.match(VerilogParser.IDENTIFIER);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public continuous_assign(): Continuous_assignContext {
		let _localctx: Continuous_assignContext = new Continuous_assignContext(this._ctx, this.state);
		this.enterRule(_localctx, 64, VerilogParser.RULE_continuous_assign);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 382;
			this.match(VerilogParser.T__22);
			this.state = 383;
			this.list_of_net_assignments();
			this.state = 384;
			this.match(VerilogParser.T__1);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public list_of_net_assignments(): List_of_net_assignmentsContext {
		let _localctx: List_of_net_assignmentsContext = new List_of_net_assignmentsContext(this._ctx, this.state);
		this.enterRule(_localctx, 66, VerilogParser.RULE_list_of_net_assignments);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 386;
			this.net_assignment();
			this.state = 391;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la === VerilogParser.T__4) {
				{
				{
				this.state = 387;
				this.match(VerilogParser.T__4);
				this.state = 388;
				this.net_assignment();
				}
				}
				this.state = 393;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public net_assignment(): Net_assignmentContext {
		let _localctx: Net_assignmentContext = new Net_assignmentContext(this._ctx, this.state);
		this.enterRule(_localctx, 68, VerilogParser.RULE_net_assignment);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 394;
			this.net_lvalue();
			this.state = 395;
			this.match(VerilogParser.T__21);
			this.state = 396;
			this.expression(0);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public initial_construct(): Initial_constructContext {
		let _localctx: Initial_constructContext = new Initial_constructContext(this._ctx, this.state);
		this.enterRule(_localctx, 70, VerilogParser.RULE_initial_construct);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 398;
			this.match(VerilogParser.T__23);
			this.state = 399;
			this.statement();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public always_construct(): Always_constructContext {
		let _localctx: Always_constructContext = new Always_constructContext(this._ctx, this.state);
		this.enterRule(_localctx, 72, VerilogParser.RULE_always_construct);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 401;
			this.match(VerilogParser.T__24);
			this.state = 402;
			this.match(VerilogParser.T__25);
			this.state = 403;
			this.match(VerilogParser.T__3);
			this.state = 404;
			this.event_expression(0);
			this.state = 405;
			this.match(VerilogParser.T__5);
			this.state = 406;
			this.statement();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}

	public event_expression(): Event_expressionContext;
	public event_expression(_p: number): Event_expressionContext;
	// @RuleVersion(0)
	public event_expression(_p?: number): Event_expressionContext {
		if (_p === undefined) {
			_p = 0;
		}

		let _parentctx: ParserRuleContext = this._ctx;
		let _parentState: number = this.state;
		let _localctx: Event_expressionContext = new Event_expressionContext(this._ctx, _parentState);
		let _prevctx: Event_expressionContext = _localctx;
		let _startState: number = 74;
		this.enterRecursionRule(_localctx, 74, VerilogParser.RULE_event_expression, _p);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 414;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case VerilogParser.T__3:
			case VerilogParser.T__7:
			case VerilogParser.T__38:
			case VerilogParser.T__39:
			case VerilogParser.T__40:
			case VerilogParser.T__41:
			case VerilogParser.T__42:
			case VerilogParser.T__43:
			case VerilogParser.T__44:
			case VerilogParser.IDENTIFIER:
			case VerilogParser.NUMBER:
				{
				this.state = 409;
				this.expression(0);
				}
				break;
			case VerilogParser.T__26:
				{
				this.state = 410;
				this.match(VerilogParser.T__26);
				this.state = 411;
				this.expression(0);
				}
				break;
			case VerilogParser.T__27:
				{
				this.state = 412;
				this.match(VerilogParser.T__27);
				this.state = 413;
				this.expression(0);
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
			this._ctx._stop = this._input.tryLT(-1);
			this.state = 421;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 42, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = _localctx;
					{
					{
					_localctx = new Event_expressionContext(_parentctx, _parentState);
					this.pushNewRecursionContext(_localctx, _startState, VerilogParser.RULE_event_expression);
					this.state = 416;
					if (!(this.precpred(this._ctx, 1))) {
						throw this.createFailedPredicateException("this.precpred(this._ctx, 1)");
					}
					this.state = 417;
					this.match(VerilogParser.T__28);
					this.state = 418;
					this.event_expression(2);
					}
					}
				}
				this.state = 423;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 42, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.unrollRecursionContexts(_parentctx);
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public statement(): StatementContext {
		let _localctx: StatementContext = new StatementContext(this._ctx, this.state);
		this.enterRule(_localctx, 76, VerilogParser.RULE_statement);
		try {
			this.state = 434;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 43, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 424;
				this.blocking_assignment();
				this.state = 425;
				this.match(VerilogParser.T__1);
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 427;
				this.non_blocking_assignment();
				this.state = 428;
				this.match(VerilogParser.T__1);
				}
				break;

			case 3:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 430;
				this.seq_block();
				}
				break;

			case 4:
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 431;
				this.conditional_statement();
				}
				break;

			case 5:
				this.enterOuterAlt(_localctx, 5);
				{
				this.state = 432;
				this.case_statement();
				}
				break;

			case 6:
				this.enterOuterAlt(_localctx, 6);
				{
				this.state = 433;
				this.match(VerilogParser.T__1);
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public seq_block(): Seq_blockContext {
		let _localctx: Seq_blockContext = new Seq_blockContext(this._ctx, this.state);
		this.enterRule(_localctx, 78, VerilogParser.RULE_seq_block);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 436;
			this.match(VerilogParser.T__29);
			this.state = 440;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la === VerilogParser.T__1 || _la === VerilogParser.T__29 || ((((_la - 33)) & ~0x1F) === 0 && ((1 << (_la - 33)) & ((1 << (VerilogParser.T__32 - 33)) | (1 << (VerilogParser.T__34 - 33)) | (1 << (VerilogParser.IDENTIFIER - 33)))) !== 0)) {
				{
				{
				this.state = 437;
				this.statement();
				}
				}
				this.state = 442;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			this.state = 443;
			this.match(VerilogParser.T__30);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public blocking_assignment(): Blocking_assignmentContext {
		let _localctx: Blocking_assignmentContext = new Blocking_assignmentContext(this._ctx, this.state);
		this.enterRule(_localctx, 80, VerilogParser.RULE_blocking_assignment);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 445;
			this.variable_lvalue();
			this.state = 446;
			this.match(VerilogParser.T__21);
			this.state = 447;
			this.expression(0);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public non_blocking_assignment(): Non_blocking_assignmentContext {
		let _localctx: Non_blocking_assignmentContext = new Non_blocking_assignmentContext(this._ctx, this.state);
		this.enterRule(_localctx, 82, VerilogParser.RULE_non_blocking_assignment);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 449;
			this.variable_lvalue();
			this.state = 450;
			this.match(VerilogParser.T__31);
			this.state = 451;
			this.expression(0);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public conditional_statement(): Conditional_statementContext {
		let _localctx: Conditional_statementContext = new Conditional_statementContext(this._ctx, this.state);
		this.enterRule(_localctx, 84, VerilogParser.RULE_conditional_statement);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 453;
			this.match(VerilogParser.T__32);
			this.state = 454;
			this.match(VerilogParser.T__3);
			this.state = 455;
			this.expression(0);
			this.state = 456;
			this.match(VerilogParser.T__5);
			this.state = 457;
			this.statement();
			this.state = 460;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 45, this._ctx) ) {
			case 1:
				{
				this.state = 458;
				this.match(VerilogParser.T__33);
				this.state = 459;
				this.statement();
				}
				break;
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public case_statement(): Case_statementContext {
		let _localctx: Case_statementContext = new Case_statementContext(this._ctx, this.state);
		this.enterRule(_localctx, 86, VerilogParser.RULE_case_statement);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 462;
			this.match(VerilogParser.T__34);
			this.state = 463;
			this.match(VerilogParser.T__3);
			this.state = 464;
			this.expression(0);
			this.state = 465;
			this.match(VerilogParser.T__5);
			this.state = 467;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			do {
				{
				{
				this.state = 466;
				this.case_item();
				}
				}
				this.state = 469;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			} while (_la === VerilogParser.T__3 || _la === VerilogParser.T__7 || ((((_la - 37)) & ~0x1F) === 0 && ((1 << (_la - 37)) & ((1 << (VerilogParser.T__36 - 37)) | (1 << (VerilogParser.T__38 - 37)) | (1 << (VerilogParser.T__39 - 37)) | (1 << (VerilogParser.T__40 - 37)) | (1 << (VerilogParser.T__41 - 37)) | (1 << (VerilogParser.T__42 - 37)) | (1 << (VerilogParser.T__43 - 37)) | (1 << (VerilogParser.T__44 - 37)) | (1 << (VerilogParser.IDENTIFIER - 37)) | (1 << (VerilogParser.NUMBER - 37)))) !== 0));
			this.state = 471;
			this.match(VerilogParser.T__35);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public case_item(): Case_itemContext {
		let _localctx: Case_itemContext = new Case_itemContext(this._ctx, this.state);
		this.enterRule(_localctx, 88, VerilogParser.RULE_case_item);
		let _la: number;
		try {
			this.state = 487;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case VerilogParser.T__3:
			case VerilogParser.T__7:
			case VerilogParser.T__38:
			case VerilogParser.T__39:
			case VerilogParser.T__40:
			case VerilogParser.T__41:
			case VerilogParser.T__42:
			case VerilogParser.T__43:
			case VerilogParser.T__44:
			case VerilogParser.IDENTIFIER:
			case VerilogParser.NUMBER:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 473;
				this.expression(0);
				this.state = 478;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === VerilogParser.T__4) {
					{
					{
					this.state = 474;
					this.match(VerilogParser.T__4);
					this.state = 475;
					this.expression(0);
					}
					}
					this.state = 480;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 481;
				this.match(VerilogParser.T__13);
				this.state = 482;
				this.statement();
				}
				break;
			case VerilogParser.T__36:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 484;
				this.match(VerilogParser.T__36);
				this.state = 485;
				this.match(VerilogParser.T__13);
				this.state = 486;
				this.statement();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public net_lvalue(): Net_lvalueContext {
		let _localctx: Net_lvalueContext = new Net_lvalueContext(this._ctx, this.state);
		this.enterRule(_localctx, 90, VerilogParser.RULE_net_lvalue);
		try {
			this.state = 502;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 49, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 489;
				this.match(VerilogParser.IDENTIFIER);
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 490;
				this.match(VerilogParser.IDENTIFIER);
				this.state = 491;
				this.match(VerilogParser.T__18);
				this.state = 492;
				this.expression(0);
				this.state = 493;
				this.match(VerilogParser.T__19);
				}
				break;

			case 3:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 495;
				this.match(VerilogParser.IDENTIFIER);
				this.state = 496;
				this.match(VerilogParser.T__18);
				this.state = 497;
				this.expression(0);
				this.state = 498;
				this.match(VerilogParser.T__13);
				this.state = 499;
				this.expression(0);
				this.state = 500;
				this.match(VerilogParser.T__19);
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public variable_lvalue(): Variable_lvalueContext {
		let _localctx: Variable_lvalueContext = new Variable_lvalueContext(this._ctx, this.state);
		this.enterRule(_localctx, 92, VerilogParser.RULE_variable_lvalue);
		try {
			this.state = 517;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 50, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 504;
				this.match(VerilogParser.IDENTIFIER);
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 505;
				this.match(VerilogParser.IDENTIFIER);
				this.state = 506;
				this.match(VerilogParser.T__18);
				this.state = 507;
				this.expression(0);
				this.state = 508;
				this.match(VerilogParser.T__19);
				}
				break;

			case 3:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 510;
				this.match(VerilogParser.IDENTIFIER);
				this.state = 511;
				this.match(VerilogParser.T__18);
				this.state = 512;
				this.expression(0);
				this.state = 513;
				this.match(VerilogParser.T__13);
				this.state = 514;
				this.expression(0);
				this.state = 515;
				this.match(VerilogParser.T__19);
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public constant_expression(): Constant_expressionContext {
		let _localctx: Constant_expressionContext = new Constant_expressionContext(this._ctx, this.state);
		this.enterRule(_localctx, 94, VerilogParser.RULE_constant_expression);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 519;
			this.expression(0);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}

	public expression(): ExpressionContext;
	public expression(_p: number): ExpressionContext;
	// @RuleVersion(0)
	public expression(_p?: number): ExpressionContext {
		if (_p === undefined) {
			_p = 0;
		}

		let _parentctx: ParserRuleContext = this._ctx;
		let _parentState: number = this.state;
		let _localctx: ExpressionContext = new ExpressionContext(this._ctx, _parentState);
		let _prevctx: ExpressionContext = _localctx;
		let _startState: number = 96;
		this.enterRecursionRule(_localctx, 96, VerilogParser.RULE_expression, _p);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 530;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case VerilogParser.T__7:
			case VerilogParser.IDENTIFIER:
			case VerilogParser.NUMBER:
				{
				this.state = 522;
				this.primary();
				}
				break;
			case VerilogParser.T__38:
			case VerilogParser.T__39:
			case VerilogParser.T__40:
			case VerilogParser.T__41:
			case VerilogParser.T__42:
			case VerilogParser.T__43:
			case VerilogParser.T__44:
				{
				this.state = 523;
				this.unary_operator();
				this.state = 524;
				this.expression(4);
				}
				break;
			case VerilogParser.T__3:
				{
				this.state = 526;
				this.match(VerilogParser.T__3);
				this.state = 527;
				this.expression(0);
				this.state = 528;
				this.match(VerilogParser.T__5);
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
			this._ctx._stop = this._input.tryLT(-1);
			this.state = 544;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 53, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = _localctx;
					{
					this.state = 542;
					this._errHandler.sync(this);
					switch ( this.interpreter.adaptivePredict(this._input, 52, this._ctx) ) {
					case 1:
						{
						_localctx = new ExpressionContext(_parentctx, _parentState);
						this.pushNewRecursionContext(_localctx, _startState, VerilogParser.RULE_expression);
						this.state = 532;
						if (!(this.precpred(this._ctx, 3))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 3)");
						}
						this.state = 533;
						this.binary_operator();
						this.state = 534;
						this.expression(4);
						}
						break;

					case 2:
						{
						_localctx = new ExpressionContext(_parentctx, _parentState);
						this.pushNewRecursionContext(_localctx, _startState, VerilogParser.RULE_expression);
						this.state = 536;
						if (!(this.precpred(this._ctx, 2))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 2)");
						}
						this.state = 537;
						this.match(VerilogParser.T__37);
						this.state = 538;
						this.expression(0);
						this.state = 539;
						this.match(VerilogParser.T__13);
						this.state = 540;
						this.expression(3);
						}
						break;
					}
					}
				}
				this.state = 546;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 53, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.unrollRecursionContexts(_parentctx);
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public primary(): PrimaryContext {
		let _localctx: PrimaryContext = new PrimaryContext(this._ctx, this.state);
		this.enterRule(_localctx, 98, VerilogParser.RULE_primary);
		try {
			this.state = 563;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 54, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 547;
				this.match(VerilogParser.NUMBER);
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 548;
				this.match(VerilogParser.IDENTIFIER);
				}
				break;

			case 3:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 549;
				this.match(VerilogParser.IDENTIFIER);
				this.state = 550;
				this.match(VerilogParser.T__18);
				this.state = 551;
				this.expression(0);
				this.state = 552;
				this.match(VerilogParser.T__19);
				}
				break;

			case 4:
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 554;
				this.match(VerilogParser.IDENTIFIER);
				this.state = 555;
				this.match(VerilogParser.T__18);
				this.state = 556;
				this.expression(0);
				this.state = 557;
				this.match(VerilogParser.T__13);
				this.state = 558;
				this.expression(0);
				this.state = 559;
				this.match(VerilogParser.T__19);
				}
				break;

			case 5:
				this.enterOuterAlt(_localctx, 5);
				{
				this.state = 561;
				this.concatenation();
				}
				break;

			case 6:
				this.enterOuterAlt(_localctx, 6);
				{
				this.state = 562;
				this.multiple_concatenation();
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public concatenation(): ConcatenationContext {
		let _localctx: ConcatenationContext = new ConcatenationContext(this._ctx, this.state);
		this.enterRule(_localctx, 100, VerilogParser.RULE_concatenation);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 565;
			this.match(VerilogParser.T__7);
			this.state = 566;
			this.expression(0);
			this.state = 571;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la === VerilogParser.T__4) {
				{
				{
				this.state = 567;
				this.match(VerilogParser.T__4);
				this.state = 568;
				this.expression(0);
				}
				}
				this.state = 573;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			this.state = 574;
			this.match(VerilogParser.T__8);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public multiple_concatenation(): Multiple_concatenationContext {
		let _localctx: Multiple_concatenationContext = new Multiple_concatenationContext(this._ctx, this.state);
		this.enterRule(_localctx, 102, VerilogParser.RULE_multiple_concatenation);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 576;
			this.match(VerilogParser.T__7);
			this.state = 577;
			this.expression(0);
			this.state = 578;
			this.concatenation();
			this.state = 579;
			this.match(VerilogParser.T__8);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public unary_operator(): Unary_operatorContext {
		let _localctx: Unary_operatorContext = new Unary_operatorContext(this._ctx, this.state);
		this.enterRule(_localctx, 104, VerilogParser.RULE_unary_operator);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 581;
			_la = this._input.LA(1);
			if (!(((((_la - 39)) & ~0x1F) === 0 && ((1 << (_la - 39)) & ((1 << (VerilogParser.T__38 - 39)) | (1 << (VerilogParser.T__39 - 39)) | (1 << (VerilogParser.T__40 - 39)) | (1 << (VerilogParser.T__41 - 39)) | (1 << (VerilogParser.T__42 - 39)) | (1 << (VerilogParser.T__43 - 39)) | (1 << (VerilogParser.T__44 - 39)))) !== 0))) {
			this._errHandler.recoverInline(this);
			} else {
				if (this._input.LA(1) === Token.EOF) {
					this.matchedEOF = true;
				}

				this._errHandler.reportMatch(this);
				this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public binary_operator(): Binary_operatorContext {
		let _localctx: Binary_operatorContext = new Binary_operatorContext(this._ctx, this.state);
		this.enterRule(_localctx, 106, VerilogParser.RULE_binary_operator);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 583;
			_la = this._input.LA(1);
			if (!(((((_la - 32)) & ~0x1F) === 0 && ((1 << (_la - 32)) & ((1 << (VerilogParser.T__31 - 32)) | (1 << (VerilogParser.T__38 - 32)) | (1 << (VerilogParser.T__39 - 32)) | (1 << (VerilogParser.T__42 - 32)) | (1 << (VerilogParser.T__43 - 32)) | (1 << (VerilogParser.T__44 - 32)) | (1 << (VerilogParser.T__45 - 32)) | (1 << (VerilogParser.T__46 - 32)) | (1 << (VerilogParser.T__47 - 32)) | (1 << (VerilogParser.T__48 - 32)) | (1 << (VerilogParser.T__49 - 32)) | (1 << (VerilogParser.T__50 - 32)) | (1 << (VerilogParser.T__51 - 32)) | (1 << (VerilogParser.T__52 - 32)) | (1 << (VerilogParser.T__53 - 32)) | (1 << (VerilogParser.T__54 - 32)) | (1 << (VerilogParser.T__55 - 32)) | (1 << (VerilogParser.T__56 - 32)) | (1 << (VerilogParser.T__57 - 32)) | (1 << (VerilogParser.T__58 - 32)) | (1 << (VerilogParser.T__59 - 32)) | (1 << (VerilogParser.T__60 - 32)))) !== 0))) {
			this._errHandler.recoverInline(this);
			} else {
				if (this._input.LA(1) === Token.EOF) {
					this.matchedEOF = true;
				}

				this._errHandler.reportMatch(this);
				this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}

	public sempred(_localctx: RuleContext, ruleIndex: number, predIndex: number): boolean {
		switch (ruleIndex) {
		case 37:
			return this.event_expression_sempred(_localctx as Event_expressionContext, predIndex);

		case 48:
			return this.expression_sempred(_localctx as ExpressionContext, predIndex);
		}
		return true;
	}
	private event_expression_sempred(_localctx: Event_expressionContext, predIndex: number): boolean {
		switch (predIndex) {
		case 0:
			return this.precpred(this._ctx, 1);
		}
		return true;
	}
	private expression_sempred(_localctx: ExpressionContext, predIndex: number): boolean {
		switch (predIndex) {
		case 1:
			return this.precpred(this._ctx, 3);

		case 2:
			return this.precpred(this._ctx, 2);
		}
		return true;
	}

	private static readonly _serializedATNSegments: number = 2;
	private static readonly _serializedATNSegment0: string =
		"\x03\uC91D\uCABA\u058D\uAFBA\u4F53\u0607\uEA8B\uC241\x03F\u024C\x04\x02" +
		"\t\x02\x04\x03\t\x03\x04\x04\t\x04\x04\x05\t\x05\x04\x06\t\x06\x04\x07" +
		"\t\x07\x04\b\t\b\x04\t\t\t\x04\n\t\n\x04\v\t\v\x04\f\t\f\x04\r\t\r\x04" +
		"\x0E\t\x0E\x04\x0F\t\x0F\x04\x10\t\x10\x04\x11\t\x11\x04\x12\t\x12\x04" +
		"\x13\t\x13\x04\x14\t\x14\x04\x15\t\x15\x04\x16\t\x16\x04\x17\t\x17\x04" +
		"\x18\t\x18\x04\x19\t\x19\x04\x1A\t\x1A\x04\x1B\t\x1B\x04\x1C\t\x1C\x04" +
		"\x1D\t\x1D\x04\x1E\t\x1E\x04\x1F\t\x1F\x04 \t \x04!\t!\x04\"\t\"\x04#" +
		"\t#\x04$\t$\x04%\t%\x04&\t&\x04\'\t\'\x04(\t(\x04)\t)\x04*\t*\x04+\t+" +
		"\x04,\t,\x04-\t-\x04.\t.\x04/\t/\x040\t0\x041\t1\x042\t2\x043\t3\x044" +
		"\t4\x045\t5\x046\t6\x047\t7\x03\x02\x07\x02p\n\x02\f\x02\x0E\x02s\v\x02" +
		"\x03\x02\x03\x02\x03\x03\x03\x03\x03\x04\x03\x04\x03\x04\x05\x04|\n\x04" +
		"\x03\x04\x03\x04\x07\x04\x80\n\x04\f\x04\x0E\x04\x83\v\x04\x03\x04\x03" +
		"\x04\x03\x04\x03\x04\x03\x04\x03\x04\x03\x04\x03\x04\x07\x04\x8D\n\x04" +
		"\f\x04\x0E\x04\x90\v\x04\x03\x04\x03\x04\x03\x04\x07\x04\x95\n\x04\f\x04" +
		"\x0E\x04\x98\v\x04\x03\x04\x03\x04\x03\x04\x03\x04\x03\x04\x03\x04\x03" +
		"\x04\x03\x04\x07\x04\xA2\n\x04\f\x04\x0E\x04\xA5\v\x04\x03\x04\x03\x04" +
		"\x05\x04\xA9\n\x04\x03\x05\x03\x05\x03\x06\x03\x06\x03\x06\x03\x06\x07" +
		"\x06\xB1\n\x06\f\x06\x0E\x06\xB4\v\x06\x03\x06\x03\x06\x03\x07\x05\x07" +
		"\xB9\n\x07\x03\x07\x03\x07\x03\x07\x03\x07\x05\x07\xBF\n\x07\x03\x07\x03" +
		"\x07\x05\x07\xC3\n\x07\x03\b\x03\b\x03\b\x03\b\x03\b\x07\b\xCA\n\b\f\b" +
		"\x0E\b\xCD\v\b\x03\b\x03\b\x05\b\xD1\n\b\x03\t\x03\t\x05\t\xD5\n\t\x03" +
		"\n\x03\n\x03\v\x03\v\x03\v\x05\v\xDC\n\v\x03\f\x03\f\x05\f\xE0\n\f\x03" +
		"\f\x05\f\xE3\n\f\x03\f\x03\f\x03\r\x03\r\x05\r\xE9\n\r\x03\r\x05\r\xEC" +
		"\n\r\x03\r\x03\r\x03\r\x03\r\x05\r\xF2\n\r\x03\r\x05\r\xF5\n\r\x03\x0E" +
		"\x03\x0E\x05\x0E\xF9\n\x0E\x03\x0E\x05\x0E\xFC\n\x0E\x03\x0E\x03\x0E\x03" +
		"\x0F\x03\x0F\x03\x0F\x03\x0F\x03\x0F\x05\x0F\u0105\n\x0F\x03\x10\x03\x10" +
		"\x03\x10\x03\x10\x03\x10\x03\x10\x03\x10\x05\x10\u010E\n\x10\x03\x11\x03" +
		"\x11\x03\x11\x05\x11\u0113\n\x11\x03\x12\x03\x12\x05\x12\u0117\n\x12\x03" +
		"\x12\x05\x12\u011A\n\x12\x03\x12\x03\x12\x03\x12\x03\x13\x03\x13\x05\x13" +
		"\u0121\n\x13\x03\x13\x05\x13\u0124\n\x13\x03\x13\x03\x13\x03\x13\x03\x13" +
		"\x03\x13\x03\x13\x05\x13\u012C\n\x13\x03\x13\x03\x13\x03\x13\x05\x13\u0131" +
		"\n\x13\x03\x14\x03\x14\x05\x14\u0135\n\x14\x03\x14\x05\x14\u0138\n\x14" +
		"\x03\x14\x03\x14\x03\x14\x03\x15\x03\x15\x05\x15\u013F\n\x15\x03\x15\x03" +
		"\x15\x03\x15\x03\x16\x03\x16\x05\x16\u0146\n\x16\x03\x16\x03\x16\x03\x16" +
		"\x03\x17\x03\x17\x03\x18\x03\x18\x03\x18\x03\x18\x03\x18\x03\x18\x03\x19" +
		"\x03\x19\x03\x19\x07\x19\u0156\n\x19\f\x19\x0E\x19\u0159\v\x19\x03\x1A" +
		"\x03\x1A\x03\x1A\x07\x1A\u015E\n\x1A\f\x1A\x0E\x1A\u0161\v\x1A\x03\x1B" +
		"\x03\x1B\x03\x1B\x07\x1B\u0166\n\x1B\f\x1B\x0E\x1B\u0169\v\x1B\x03\x1C" +
		"\x03\x1C\x03\x1D\x03\x1D\x03\x1E\x03\x1E\x03\x1E\x03\x1E\x03\x1F\x03\x1F" +
		"\x03\x1F\x07\x1F\u0176\n\x1F\f\x1F\x0E\x1F\u0179\v\x1F\x03 \x03 \x03 " +
		"\x03 \x03!\x03!\x03\"\x03\"\x03\"\x03\"\x03#\x03#\x03#\x07#\u0188\n#\f" +
		"#\x0E#\u018B\v#\x03$\x03$\x03$\x03$\x03%\x03%\x03%\x03&\x03&\x03&\x03" +
		"&\x03&\x03&\x03&\x03\'\x03\'\x03\'\x03\'\x03\'\x03\'\x05\'\u01A1\n\'\x03" +
		"\'\x03\'\x03\'\x07\'\u01A6\n\'\f\'\x0E\'\u01A9\v\'\x03(\x03(\x03(\x03" +
		"(\x03(\x03(\x03(\x03(\x03(\x03(\x05(\u01B5\n(\x03)\x03)\x07)\u01B9\n)" +
		"\f)\x0E)\u01BC\v)\x03)\x03)\x03*\x03*\x03*\x03*\x03+\x03+\x03+\x03+\x03" +
		",\x03,\x03,\x03,\x03,\x03,\x03,\x05,\u01CF\n,\x03-\x03-\x03-\x03-\x03" +
		"-\x06-\u01D6\n-\r-\x0E-\u01D7\x03-\x03-\x03.\x03.\x03.\x07.\u01DF\n.\f" +
		".\x0E.\u01E2\v.\x03.\x03.\x03.\x03.\x03.\x03.\x05.\u01EA\n.\x03/\x03/" +
		"\x03/\x03/\x03/\x03/\x03/\x03/\x03/\x03/\x03/\x03/\x03/\x05/\u01F9\n/" +
		"\x030\x030\x030\x030\x030\x030\x030\x030\x030\x030\x030\x030\x030\x05" +
		"0\u0208\n0\x031\x031\x032\x032\x032\x032\x032\x032\x032\x032\x032\x05" +
		"2\u0215\n2\x032\x032\x032\x032\x032\x032\x032\x032\x032\x032\x072\u0221" +
		"\n2\f2\x0E2\u0224\v2\x033\x033\x033\x033\x033\x033\x033\x033\x033\x03" +
		"3\x033\x033\x033\x033\x033\x033\x053\u0236\n3\x034\x034\x034\x034\x07" +
		"4\u023C\n4\f4\x0E4\u023F\v4\x034\x034\x035\x035\x035\x035\x035\x036\x03" +
		"6\x037\x037\x037\x02\x02\x04Lb8\x02\x02\x04\x02\x06\x02\b\x02\n\x02\f" +
		"\x02\x0E\x02\x10\x02\x12\x02\x14\x02\x16\x02\x18\x02\x1A\x02\x1C\x02\x1E" +
		"\x02 \x02\"\x02$\x02&\x02(\x02*\x02,\x02.\x020\x022\x024\x026\x028\x02" +
		":\x02<\x02>\x02@\x02B\x02D\x02F\x02H\x02J\x02L\x02N\x02P\x02R\x02T\x02" +
		"V\x02X\x02Z\x02\\\x02^\x02`\x02b\x02d\x02f\x02h\x02j\x02l\x02\x02\x05" +
		"\x03\x02\x11\x14\x03\x02)/\x05\x02\"\")*-?\x02\u0261\x02q\x03\x02\x02" +
		"\x02\x04v\x03\x02\x02\x02\x06\xA8\x03\x02\x02\x02\b\xAA\x03\x02\x02\x02" +
		"\n\xAC\x03\x02\x02\x02\f\xC2\x03\x02\x02\x02\x0E\xD0\x03\x02\x02\x02\x10" +
		"\xD2\x03\x02\x02\x02\x12\xD6\x03\x02\x02\x02\x14\xDB\x03\x02\x02\x02\x16" +
		"\xDD\x03\x02\x02\x02\x18\xF4\x03\x02\x02\x02\x1A\xF6\x03\x02\x02\x02\x1C" +
		"\u0104\x03\x02\x02\x02\x1E\u010D\x03\x02\x02\x02 \u0112\x03\x02\x02\x02" +
		"\"\u0114\x03\x02\x02\x02$\u0130\x03\x02\x02\x02&\u0132\x03\x02\x02\x02" +
		"(\u013C\x03\x02\x02\x02*\u0143\x03\x02\x02\x02,\u014A\x03\x02\x02\x02" +
		".\u014C\x03\x02\x02\x020\u0152\x03\x02\x02\x022\u015A\x03\x02\x02\x02" +
		"4\u0162\x03\x02\x02\x026\u016A\x03\x02\x02\x028\u016C\x03\x02\x02\x02" +
		":\u016E\x03\x02\x02\x02<\u0172\x03\x02\x02\x02>\u017A\x03\x02\x02\x02" +
		"@\u017E\x03\x02\x02\x02B\u0180\x03\x02\x02\x02D\u0184\x03\x02\x02\x02" +
		"F\u018C\x03\x02\x02\x02H\u0190\x03\x02\x02\x02J\u0193\x03\x02\x02\x02" +
		"L\u01A0\x03\x02\x02\x02N\u01B4\x03\x02\x02\x02P\u01B6\x03\x02\x02\x02" +
		"R\u01BF\x03\x02\x02\x02T\u01C3\x03\x02\x02\x02V\u01C7\x03\x02\x02\x02" +
		"X\u01D0\x03\x02\x02\x02Z\u01E9\x03\x02\x02\x02\\\u01F8\x03\x02\x02\x02" +
		"^\u0207\x03\x02\x02\x02`\u0209\x03\x02\x02\x02b\u0214\x03\x02\x02\x02" +
		"d\u0235\x03\x02\x02\x02f\u0237\x03\x02\x02\x02h\u0242\x03\x02\x02\x02" +
		"j\u0247\x03\x02\x02\x02l\u0249\x03\x02\x02\x02np\x05\x04\x03\x02on\x03" +
		"\x02\x02\x02ps\x03\x02\x02\x02qo\x03\x02\x02\x02qr\x03\x02\x02\x02rt\x03" +
		"\x02\x02\x02sq\x03\x02\x02\x02tu\x07\x02\x02\x03u\x03\x03\x02\x02\x02" +
		"vw\x05\x06\x04\x02w\x05\x03\x02\x02\x02xy\x07\x03\x02\x02y{\x05\b\x05" +
		"\x02z|\x05\n\x06\x02{z\x03\x02\x02\x02{|\x03\x02\x02\x02|}\x03\x02\x02" +
		"\x02}\x81\x07\x04\x02\x02~\x80\x05\x1E\x10\x02\x7F~\x03\x02\x02\x02\x80" +
		"\x83\x03\x02\x02\x02\x81\x7F\x03\x02\x02\x02\x81\x82\x03\x02\x02\x02\x82" +
		"\x84\x03\x02\x02\x02\x83\x81\x03\x02\x02\x02\x84\x85\x07\x05\x02\x02\x85" +
		"\xA9\x03\x02\x02\x02\x86\x87\x07\x03\x02\x02\x87\x88\x05\b\x05\x02\x88" +
		"\x89\x07\x06\x02\x02\x89\x8E\x05\x14\v\x02\x8A\x8B\x07\x07\x02\x02\x8B" +
		"\x8D\x05\x14\v\x02\x8C\x8A\x03\x02\x02\x02\x8D\x90\x03\x02\x02\x02\x8E" +
		"\x8C\x03\x02\x02\x02\x8E\x8F\x03\x02\x02\x02\x8F\x91\x03\x02\x02\x02\x90" +
		"\x8E\x03\x02\x02\x02\x91\x92\x07\b\x02\x02\x92\x96\x07\x04\x02\x02\x93" +
		"\x95\x05\x1E\x10\x02\x94\x93\x03\x02\x02\x02\x95\x98\x03\x02\x02\x02\x96" +
		"\x94\x03\x02\x02\x02\x96\x97\x03\x02\x02\x02\x97\x99\x03\x02\x02\x02\x98" +
		"\x96\x03\x02\x02\x02\x99\x9A\x07\x05\x02\x02\x9A\xA9\x03\x02\x02\x02\x9B" +
		"\x9C\x07\x03\x02\x02\x9C\x9D\x05\b\x05\x02\x9D\x9E\x07\x06\x02\x02\x9E" +
		"\x9F\x07\b\x02\x02\x9F\xA3\x07\x04\x02\x02\xA0\xA2\x05\x1E\x10\x02\xA1" +
		"\xA0\x03\x02\x02\x02\xA2\xA5\x03\x02\x02\x02\xA3\xA1\x03\x02\x02\x02\xA3" +
		"\xA4\x03\x02\x02\x02\xA4\xA6\x03\x02\x02\x02\xA5\xA3\x03\x02\x02\x02\xA6" +
		"\xA7\x07\x05\x02\x02\xA7\xA9\x03\x02\x02\x02\xA8x\x03\x02\x02\x02\xA8" +
		"\x86\x03\x02\x02\x02\xA8\x9B\x03\x02\x02\x02\xA9\x07\x03\x02\x02\x02\xAA" +
		"\xAB\x07@\x02\x02\xAB\t\x03\x02\x02\x02\xAC\xAD\x07\x06\x02\x02\xAD\xB2" +
		"\x05\f\x07\x02\xAE\xAF\x07\x07\x02\x02\xAF\xB1\x05\f\x07\x02\xB0\xAE\x03" +
		"\x02\x02\x02\xB1\xB4\x03\x02\x02\x02\xB2\xB0\x03\x02\x02\x02\xB2\xB3\x03" +
		"\x02\x02\x02\xB3\xB5\x03\x02\x02\x02\xB4\xB2\x03\x02\x02\x02\xB5\xB6\x07" +
		"\b\x02\x02\xB6\v\x03\x02\x02\x02\xB7\xB9\x05\x0E\b\x02\xB8\xB7\x03\x02" +
		"\x02\x02\xB8\xB9\x03\x02\x02\x02\xB9\xC3\x03\x02\x02\x02\xBA\xBB\x07\t" +
		"\x02\x02\xBB\xBC\x05\x12\n\x02\xBC\xBE\x07\x06\x02\x02\xBD\xBF\x05\x0E" +
		"\b\x02\xBE\xBD\x03\x02\x02\x02\xBE\xBF\x03\x02\x02\x02\xBF\xC0\x03\x02" +
		"\x02\x02\xC0\xC1\x07\b\x02\x02\xC1\xC3\x03\x02\x02\x02\xC2\xB8\x03\x02" +
		"\x02\x02\xC2\xBA\x03\x02\x02\x02\xC3\r\x03\x02\x02\x02\xC4\xD1\x05\x10" +
		"\t\x02\xC5\xC6\x07\n\x02\x02\xC6\xCB\x05\x10\t\x02\xC7\xC8\x07\x07\x02" +
		"\x02\xC8\xCA\x05\x10\t\x02\xC9\xC7\x03\x02\x02\x02\xCA\xCD\x03\x02\x02" +
		"\x02\xCB\xC9\x03\x02\x02\x02\xCB\xCC\x03\x02\x02\x02\xCC\xCE\x03\x02\x02" +
		"\x02\xCD\xCB\x03\x02\x02\x02\xCE\xCF\x07\v\x02\x02\xCF\xD1\x03\x02\x02" +
		"\x02\xD0\xC4\x03\x02\x02\x02\xD0\xC5\x03\x02\x02\x02\xD1\x0F\x03\x02\x02" +
		"\x02\xD2\xD4\x05\x12\n\x02\xD3\xD5\x05\x1C\x0F\x02\xD4\xD3\x03\x02\x02" +
		"\x02\xD4\xD5\x03\x02\x02\x02\xD5\x11\x03\x02\x02\x02\xD6\xD7\x07@\x02" +
		"\x02\xD7\x13\x03\x02\x02\x02\xD8\xDC\x05\x16\f\x02\xD9\xDC\x05\x18\r\x02" +
		"\xDA\xDC\x05\x1A\x0E\x02\xDB\xD8\x03\x02\x02\x02\xDB\xD9\x03\x02\x02\x02" +
		"\xDB\xDA\x03\x02\x02\x02\xDC\x15\x03\x02\x02\x02\xDD\xDF\x07\f\x02\x02" +
		"\xDE\xE0\x05,\x17\x02\xDF\xDE\x03\x02\x02\x02\xDF\xE0\x03\x02\x02\x02" +
		"\xE0\xE2\x03\x02\x02\x02\xE1\xE3\x05.\x18\x02\xE2\xE1\x03\x02\x02\x02" +
		"\xE2\xE3\x03\x02\x02\x02\xE3\xE4\x03\x02\x02\x02\xE4\xE5\x05\x12\n\x02" +
		"\xE5\x17\x03\x02\x02\x02\xE6\xE8\x07\r\x02\x02\xE7\xE9\x05,\x17\x02\xE8" +
		"\xE7\x03\x02\x02\x02\xE8\xE9\x03\x02\x02\x02\xE9\xEB\x03\x02\x02\x02\xEA" +
		"\xEC\x05.\x18\x02\xEB\xEA\x03\x02\x02\x02\xEB\xEC\x03\x02\x02\x02\xEC" +
		"\xED\x03\x02\x02\x02\xED\xF5\x05\x12\n\x02\xEE\xEF\x07\r\x02\x02\xEF\xF1" +
		"\x07\x0E\x02\x02\xF0\xF2\x05.\x18\x02\xF1\xF0\x03\x02\x02\x02\xF1\xF2" +
		"\x03\x02\x02\x02\xF2\xF3\x03\x02\x02\x02\xF3\xF5\x05\x12\n\x02\xF4\xE6" +
		"\x03\x02\x02\x02\xF4\xEE\x03\x02\x02\x02\xF5\x19\x03\x02\x02\x02\xF6\xF8" +
		"\x07\x0F\x02\x02\xF7\xF9\x05,\x17\x02\xF8\xF7\x03\x02\x02\x02\xF8\xF9" +
		"\x03\x02\x02\x02\xF9\xFB\x03\x02\x02\x02\xFA\xFC\x05.\x18\x02\xFB\xFA" +
		"\x03\x02\x02\x02\xFB\xFC\x03\x02\x02\x02\xFC\xFD\x03\x02\x02\x02\xFD\xFE" +
		"\x05\x12\n\x02\xFE\x1B\x03\x02\x02\x02\xFF\u0105\x05`1\x02\u0100\u0101" +
		"\x05`1\x02\u0101\u0102\x07\x10\x02\x02\u0102\u0103\x05`1\x02\u0103\u0105" +
		"\x03\x02\x02\x02\u0104\xFF\x03\x02\x02\x02\u0104\u0100\x03\x02\x02\x02" +
		"\u0105\x1D\x03\x02\x02\x02\u0106\u010E\x05 \x11\x02\u0107\u010E\x05(\x15" +
		"\x02\u0108\u010E\x05*\x16\x02\u0109\u010E\x05:\x1E\x02\u010A\u010E\x05" +
		"B\"\x02\u010B\u010E\x05H%\x02\u010C\u010E\x05J&\x02\u010D\u0106\x03\x02" +
		"\x02\x02\u010D\u0107\x03\x02\x02\x02\u010D\u0108\x03\x02\x02\x02\u010D" +
		"\u0109\x03\x02\x02\x02\u010D\u010A\x03\x02\x02\x02\u010D\u010B\x03\x02" +
		"\x02\x02\u010D\u010C\x03\x02\x02\x02\u010E\x1F\x03\x02\x02\x02\u010F\u0113" +
		"\x05\"\x12\x02\u0110\u0113\x05$\x13\x02\u0111\u0113\x05&\x14\x02\u0112" +
		"\u010F\x03\x02\x02\x02\u0112\u0110\x03\x02\x02\x02\u0112\u0111\x03\x02" +
		"\x02\x02\u0113!\x03\x02\x02\x02\u0114\u0116\x07\f\x02\x02\u0115\u0117" +
		"\x05,\x17\x02\u0116\u0115\x03\x02\x02\x02\u0116\u0117\x03\x02\x02\x02" +
		"\u0117\u0119\x03\x02\x02\x02\u0118\u011A\x05.\x18\x02\u0119\u0118\x03" +
		"\x02\x02\x02\u0119\u011A\x03\x02\x02\x02\u011A\u011B\x03\x02\x02\x02\u011B" +
		"\u011C\x050\x19\x02\u011C\u011D\x07\x04\x02\x02\u011D#\x03\x02\x02\x02" +
		"\u011E\u0120\x07\r\x02\x02\u011F\u0121\x05,\x17\x02\u0120\u011F\x03\x02" +
		"\x02\x02\u0120\u0121\x03\x02\x02\x02\u0121\u0123\x03\x02\x02\x02\u0122" +
		"\u0124\x05.\x18\x02\u0123\u0122\x03\x02\x02\x02\u0123\u0124\x03\x02\x02" +
		"\x02\u0124\u0125\x03\x02\x02\x02\u0125\u0126\x050\x19\x02\u0126\u0127" +
		"\x07\x04\x02\x02\u0127\u0131\x03\x02\x02\x02\u0128\u0129\x07\r\x02\x02" +
		"\u0129\u012B\x07\x0E\x02\x02\u012A\u012C\x05.\x18\x02\u012B\u012A\x03" +
		"\x02\x02\x02\u012B\u012C\x03\x02\x02\x02\u012C\u012D\x03\x02\x02\x02\u012D" +
		"\u012E\x050\x19\x02\u012E\u012F\x07\x04\x02\x02\u012F\u0131\x03\x02\x02" +
		"\x02\u0130\u011E\x03\x02\x02\x02\u0130\u0128\x03\x02\x02\x02\u0131%\x03" +
		"\x02\x02\x02\u0132\u0134\x07\x0F\x02\x02\u0133\u0135\x05,\x17\x02\u0134" +
		"\u0133\x03\x02\x02\x02\u0134\u0135\x03\x02\x02\x02\u0135\u0137\x03\x02" +
		"\x02\x02\u0136\u0138\x05.\x18\x02\u0137\u0136\x03\x02\x02\x02\u0137\u0138" +
		"\x03\x02\x02\x02\u0138\u0139\x03\x02\x02\x02\u0139\u013A\x050\x19\x02" +
		"\u013A\u013B\x07\x04\x02\x02\u013B\'\x03\x02\x02\x02\u013C\u013E\x05," +
		"\x17\x02\u013D\u013F\x05.\x18\x02\u013E\u013D\x03\x02\x02\x02\u013E\u013F" +
		"\x03\x02\x02\x02\u013F\u0140\x03\x02\x02\x02\u0140\u0141\x052\x1A\x02" +
		"\u0141\u0142\x07\x04\x02\x02\u0142)\x03\x02\x02\x02\u0143\u0145\x07\x0E" +
		"\x02\x02\u0144\u0146\x05.\x18\x02\u0145\u0144\x03\x02\x02\x02\u0145\u0146" +
		"\x03\x02\x02\x02\u0146\u0147\x03\x02\x02\x02\u0147\u0148\x054\x1B\x02" +
		"\u0148\u0149\x07\x04\x02\x02\u0149+\x03\x02\x02\x02\u014A\u014B\t\x02" +
		"\x02\x02\u014B-\x03\x02\x02\x02\u014C\u014D\x07\x15\x02\x02\u014D\u014E" +
		"\x05`1\x02\u014E\u014F\x07\x10\x02\x02\u014F\u0150\x05`1\x02\u0150\u0151" +
		"\x07\x16\x02\x02\u0151/\x03\x02\x02\x02\u0152\u0157\x05\x12\n\x02\u0153" +
		"\u0154\x07\x07\x02\x02\u0154\u0156\x05\x12\n\x02\u0155\u0153\x03\x02\x02" +
		"\x02\u0156\u0159\x03\x02\x02\x02\u0157\u0155\x03\x02\x02\x02\u0157\u0158" +
		"\x03\x02\x02\x02\u01581\x03\x02\x02\x02\u0159\u0157\x03\x02\x02\x02\u015A" +
		"\u015F\x056\x1C\x02\u015B\u015C\x07\x07\x02\x02\u015C\u015E\x056\x1C\x02" +
		"\u015D\u015B\x03\x02\x02\x02\u015E\u0161\x03\x02\x02\x02\u015F\u015D\x03" +
		"\x02\x02\x02\u015F\u0160\x03\x02\x02\x02\u01603\x03\x02\x02\x02\u0161" +
		"\u015F\x03\x02\x02\x02\u0162\u0167\x058\x1D\x02\u0163\u0164\x07\x07\x02" +
		"\x02\u0164\u0166\x058\x1D\x02\u0165\u0163\x03\x02\x02\x02\u0166\u0169" +
		"\x03\x02\x02\x02\u0167\u0165\x03\x02\x02\x02\u0167\u0168\x03\x02\x02\x02" +
		"\u01685\x03\x02\x02\x02\u0169\u0167\x03\x02\x02\x02\u016A\u016B\x07@\x02" +
		"\x02\u016B7\x03\x02\x02\x02\u016C\u016D\x07@\x02\x02\u016D9\x03\x02\x02" +
		"\x02\u016E\u016F\x07\x17\x02\x02\u016F\u0170\x05<\x1F\x02\u0170\u0171" +
		"\x07\x04\x02\x02\u0171;\x03\x02\x02\x02\u0172\u0177\x05> \x02\u0173\u0174" +
		"\x07\x07\x02\x02\u0174\u0176\x05> \x02\u0175\u0173\x03\x02\x02\x02\u0176" +
		"\u0179\x03\x02\x02\x02\u0177\u0175\x03\x02\x02\x02\u0177\u0178\x03\x02" +
		"\x02\x02\u0178=\x03\x02\x02\x02\u0179\u0177\x03\x02\x02\x02\u017A\u017B" +
		"\x05@!\x02\u017B\u017C\x07\x18\x02\x02\u017C\u017D\x05`1\x02\u017D?\x03" +
		"\x02\x02\x02\u017E\u017F\x07@\x02\x02\u017FA\x03\x02\x02\x02\u0180\u0181" +
		"\x07\x19\x02\x02\u0181\u0182\x05D#\x02\u0182\u0183\x07\x04\x02\x02\u0183" +
		"C\x03\x02\x02\x02\u0184\u0189\x05F$\x02\u0185\u0186\x07\x07\x02\x02\u0186" +
		"\u0188\x05F$\x02\u0187\u0185\x03\x02\x02\x02\u0188\u018B\x03\x02\x02\x02" +
		"\u0189\u0187\x03\x02\x02\x02\u0189\u018A\x03\x02\x02\x02\u018AE\x03\x02" +
		"\x02\x02\u018B\u0189\x03\x02\x02\x02\u018C\u018D\x05\\/\x02\u018D\u018E" +
		"\x07\x18\x02\x02\u018E\u018F\x05b2\x02\u018FG\x03\x02\x02\x02\u0190\u0191" +
		"\x07\x1A\x02\x02\u0191\u0192\x05N(\x02\u0192I\x03\x02\x02\x02\u0193\u0194" +
		"\x07\x1B\x02\x02\u0194\u0195\x07\x1C\x02\x02\u0195\u0196\x07\x06\x02\x02" +
		"\u0196\u0197\x05L\'\x02\u0197\u0198\x07\b\x02\x02\u0198\u0199\x05N(\x02" +
		"\u0199K\x03\x02\x02\x02\u019A\u019B\b\'\x01\x02\u019B\u01A1\x05b2\x02" +
		"\u019C\u019D\x07\x1D\x02\x02\u019D\u01A1\x05b2\x02\u019E\u019F\x07\x1E" +
		"\x02\x02\u019F\u01A1\x05b2\x02\u01A0\u019A\x03\x02\x02\x02\u01A0\u019C" +
		"\x03\x02\x02\x02\u01A0\u019E\x03\x02\x02\x02\u01A1\u01A7\x03\x02\x02\x02" +
		"\u01A2\u01A3\f\x03\x02\x02\u01A3\u01A4\x07\x1F\x02\x02\u01A4\u01A6\x05" +
		"L\'\x04\u01A5\u01A2\x03\x02\x02\x02\u01A6\u01A9\x03\x02\x02\x02\u01A7" +
		"\u01A5\x03\x02\x02\x02\u01A7\u01A8\x03\x02\x02\x02\u01A8M\x03\x02\x02" +
		"\x02\u01A9\u01A7\x03\x02\x02\x02\u01AA\u01AB\x05R*\x02\u01AB\u01AC\x07" +
		"\x04\x02\x02\u01AC\u01B5\x03\x02\x02\x02\u01AD\u01AE\x05T+\x02\u01AE\u01AF" +
		"\x07\x04\x02\x02\u01AF\u01B5\x03\x02\x02\x02\u01B0\u01B5\x05P)\x02\u01B1" +
		"\u01B5\x05V,\x02\u01B2\u01B5\x05X-\x02\u01B3\u01B5\x07\x04\x02\x02\u01B4" +
		"\u01AA\x03\x02\x02\x02\u01B4\u01AD\x03\x02\x02\x02\u01B4\u01B0\x03\x02" +
		"\x02\x02\u01B4\u01B1\x03\x02\x02\x02\u01B4\u01B2\x03\x02\x02\x02\u01B4" +
		"\u01B3\x03\x02\x02\x02\u01B5O\x03\x02\x02\x02\u01B6\u01BA\x07 \x02\x02" +
		"\u01B7\u01B9\x05N(\x02\u01B8\u01B7\x03\x02\x02\x02\u01B9\u01BC\x03\x02" +
		"\x02\x02\u01BA\u01B8\x03\x02\x02\x02\u01BA\u01BB\x03\x02\x02\x02\u01BB" +
		"\u01BD\x03\x02\x02\x02\u01BC\u01BA\x03\x02\x02\x02\u01BD\u01BE\x07!\x02" +
		"\x02\u01BEQ\x03\x02\x02\x02\u01BF\u01C0\x05^0\x02\u01C0\u01C1\x07\x18" +
		"\x02\x02\u01C1\u01C2\x05b2\x02\u01C2S\x03\x02\x02\x02\u01C3\u01C4\x05" +
		"^0\x02\u01C4\u01C5\x07\"\x02\x02\u01C5\u01C6\x05b2\x02\u01C6U\x03\x02" +
		"\x02\x02\u01C7\u01C8\x07#\x02\x02\u01C8\u01C9\x07\x06\x02\x02\u01C9\u01CA" +
		"\x05b2\x02\u01CA\u01CB\x07\b\x02\x02\u01CB\u01CE\x05N(\x02\u01CC\u01CD" +
		"\x07$\x02\x02\u01CD\u01CF\x05N(\x02\u01CE\u01CC\x03\x02\x02\x02\u01CE" +
		"\u01CF\x03\x02\x02\x02\u01CFW\x03\x02\x02\x02\u01D0\u01D1\x07%\x02\x02" +
		"\u01D1\u01D2\x07\x06\x02\x02\u01D2\u01D3\x05b2\x02\u01D3\u01D5\x07\b\x02" +
		"\x02\u01D4\u01D6\x05Z.\x02\u01D5\u01D4\x03\x02\x02\x02\u01D6\u01D7\x03" +
		"\x02\x02\x02\u01D7\u01D5\x03\x02\x02\x02\u01D7\u01D8\x03\x02\x02\x02\u01D8" +
		"\u01D9\x03\x02\x02\x02\u01D9\u01DA\x07&\x02\x02\u01DAY\x03\x02\x02\x02" +
		"\u01DB\u01E0\x05b2\x02\u01DC\u01DD\x07\x07\x02\x02\u01DD\u01DF\x05b2\x02" +
		"\u01DE\u01DC\x03\x02\x02\x02\u01DF\u01E2\x03\x02\x02\x02\u01E0\u01DE\x03" +
		"\x02\x02\x02\u01E0\u01E1\x03\x02\x02\x02\u01E1\u01E3\x03\x02\x02\x02\u01E2" +
		"\u01E0\x03\x02\x02\x02\u01E3\u01E4\x07\x10\x02\x02\u01E4\u01E5\x05N(\x02" +
		"\u01E5\u01EA\x03\x02\x02\x02\u01E6\u01E7\x07\'\x02\x02\u01E7\u01E8\x07" +
		"\x10\x02\x02\u01E8\u01EA\x05N(\x02\u01E9\u01DB\x03\x02\x02\x02\u01E9\u01E6" +
		"\x03\x02\x02\x02\u01EA[\x03\x02\x02\x02\u01EB\u01F9\x07@\x02\x02\u01EC" +
		"\u01ED\x07@\x02\x02\u01ED\u01EE\x07\x15\x02\x02\u01EE\u01EF\x05b2\x02" +
		"\u01EF\u01F0\x07\x16\x02\x02\u01F0\u01F9\x03\x02\x02\x02\u01F1\u01F2\x07" +
		"@\x02\x02\u01F2\u01F3\x07\x15\x02\x02\u01F3\u01F4\x05b2\x02\u01F4\u01F5" +
		"\x07\x10\x02\x02\u01F5\u01F6\x05b2\x02\u01F6\u01F7\x07\x16\x02\x02\u01F7" +
		"\u01F9\x03\x02\x02\x02\u01F8\u01EB\x03\x02\x02\x02\u01F8\u01EC\x03\x02" +
		"\x02\x02\u01F8\u01F1\x03\x02\x02\x02\u01F9]\x03\x02\x02\x02\u01FA\u0208" +
		"\x07@\x02\x02\u01FB\u01FC\x07@\x02\x02\u01FC\u01FD\x07\x15\x02\x02\u01FD" +
		"\u01FE\x05b2\x02\u01FE\u01FF\x07\x16\x02\x02\u01FF\u0208\x03\x02\x02\x02" +
		"\u0200\u0201\x07@\x02\x02\u0201\u0202\x07\x15\x02\x02\u0202\u0203\x05" +
		"b2\x02\u0203\u0204\x07\x10\x02\x02\u0204\u0205\x05b2\x02\u0205\u0206\x07" +
		"\x16\x02\x02\u0206\u0208\x03\x02\x02\x02\u0207\u01FA\x03\x02\x02\x02\u0207" +
		"\u01FB\x03\x02\x02\x02\u0207\u0200\x03\x02\x02\x02\u0208_\x03\x02\x02" +
		"\x02\u0209\u020A\x05b2\x02\u020Aa\x03\x02\x02\x02\u020B\u020C\b2\x01\x02" +
		"\u020C\u0215\x05d3\x02\u020D\u020E\x05j6\x02\u020E\u020F\x05b2\x06\u020F" +
		"\u0215\x03\x02\x02\x02\u0210\u0211\x07\x06\x02\x02\u0211\u0212\x05b2\x02" +
		"\u0212\u0213\x07\b\x02\x02\u0213\u0215\x03\x02\x02\x02\u0214\u020B\x03" +
		"\x02\x02\x02\u0214\u020D\x03\x02\x02\x02\u0214\u0210\x03\x02\x02\x02\u0215" +
		"\u0222\x03\x02\x02\x02\u0216\u0217\f\x05\x02\x02\u0217\u0218\x05l7\x02" +
		"\u0218\u0219\x05b2\x06\u0219\u0221\x03\x02\x02\x02\u021A\u021B\f\x04\x02" +
		"\x02\u021B\u021C\x07(\x02\x02\u021C\u021D\x05b2\x02\u021D\u021E\x07\x10" +
		"\x02\x02\u021E\u021F\x05b2\x05\u021F\u0221\x03\x02\x02\x02\u0220\u0216" +
		"\x03\x02\x02\x02\u0220\u021A\x03\x02\x02\x02\u0221\u0224\x03\x02\x02\x02" +
		"\u0222\u0220\x03\x02\x02\x02\u0222\u0223\x03\x02\x02\x02\u0223c\x03\x02" +
		"\x02\x02\u0224\u0222\x03\x02\x02\x02\u0225\u0236\x07A\x02\x02\u0226\u0236" +
		"\x07@\x02\x02\u0227\u0228\x07@\x02\x02\u0228\u0229\x07\x15\x02\x02\u0229" +
		"\u022A\x05b2\x02\u022A\u022B\x07\x16\x02\x02\u022B\u0236\x03\x02\x02\x02" +
		"\u022C\u022D\x07@\x02\x02\u022D\u022E\x07\x15\x02\x02\u022E\u022F\x05" +
		"b2\x02\u022F\u0230\x07\x10\x02\x02\u0230\u0231\x05b2\x02\u0231\u0232\x07" +
		"\x16\x02\x02\u0232\u0236\x03\x02\x02\x02\u0233\u0236\x05f4\x02\u0234\u0236" +
		"\x05h5\x02\u0235\u0225\x03\x02\x02\x02\u0235\u0226\x03\x02\x02\x02\u0235" +
		"\u0227\x03\x02\x02\x02\u0235\u022C\x03\x02\x02\x02\u0235\u0233\x03\x02" +
		"\x02\x02\u0235\u0234\x03\x02\x02\x02\u0236e\x03\x02\x02\x02\u0237\u0238" +
		"\x07\n\x02\x02\u0238\u023D\x05b2\x02\u0239\u023A\x07\x07\x02\x02\u023A" +
		"\u023C\x05b2\x02\u023B\u0239\x03\x02\x02\x02\u023C\u023F\x03\x02\x02\x02" +
		"\u023D\u023B\x03\x02\x02\x02\u023D\u023E\x03\x02\x02\x02\u023E\u0240\x03" +
		"\x02\x02\x02\u023F\u023D\x03\x02\x02\x02\u0240\u0241\x07\v\x02\x02\u0241" +
		"g\x03\x02\x02\x02\u0242\u0243\x07\n\x02\x02\u0243\u0244\x05b2\x02\u0244" +
		"\u0245\x05f4\x02\u0245\u0246\x07";
	private static readonly _serializedATNSegment1: string =
		"\v\x02\x02\u0246i\x03\x02\x02\x02\u0247\u0248\t\x03\x02\x02\u0248k\x03" +
		"\x02\x02\x02\u0249\u024A\t\x04\x02\x02\u024Am\x03\x02\x02\x02:q{\x81\x8E" +
		"\x96\xA3\xA8\xB2\xB8\xBE\xC2\xCB\xD0\xD4\xDB\xDF\xE2\xE8\xEB\xF1\xF4\xF8" +
		"\xFB\u0104\u010D\u0112\u0116\u0119\u0120\u0123\u012B\u0130\u0134\u0137" +
		"\u013E\u0145\u0157\u015F\u0167\u0177\u0189\u01A0\u01A7\u01B4\u01BA\u01CE" +
		"\u01D7\u01E0\u01E9\u01F8\u0207\u0214\u0220\u0222\u0235\u023D";
	public static readonly _serializedATN: string = Utils.join(
		[
			VerilogParser._serializedATNSegment0,
			VerilogParser._serializedATNSegment1,
		],
		"",
	);
	public static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!VerilogParser.__ATN) {
			VerilogParser.__ATN = new ATNDeserializer().deserialize(Utils.toCharArray(VerilogParser._serializedATN));
		}

		return VerilogParser.__ATN;
	}

}

export class Source_textContext extends ParserRuleContext {
	public EOF(): TerminalNode { return this.getToken(VerilogParser.EOF, 0); }
	public description(): DescriptionContext[];
	public description(i: number): DescriptionContext;
	public description(i?: number): DescriptionContext | DescriptionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(DescriptionContext);
		} else {
			return this.getRuleContext(i, DescriptionContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_source_text; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterSource_text) {
			listener.enterSource_text(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitSource_text) {
			listener.exitSource_text(this);
		}
	}
}


export class DescriptionContext extends ParserRuleContext {
	public module_declaration(): Module_declarationContext {
		return this.getRuleContext(0, Module_declarationContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_description; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterDescription) {
			listener.enterDescription(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitDescription) {
			listener.exitDescription(this);
		}
	}
}


export class Module_declarationContext extends ParserRuleContext {
	public module_identifier(): Module_identifierContext {
		return this.getRuleContext(0, Module_identifierContext);
	}
	public list_of_ports(): List_of_portsContext | undefined {
		return this.tryGetRuleContext(0, List_of_portsContext);
	}
	public module_item(): Module_itemContext[];
	public module_item(i: number): Module_itemContext;
	public module_item(i?: number): Module_itemContext | Module_itemContext[] {
		if (i === undefined) {
			return this.getRuleContexts(Module_itemContext);
		} else {
			return this.getRuleContext(i, Module_itemContext);
		}
	}
	public ansi_port_declaration(): Ansi_port_declarationContext[];
	public ansi_port_declaration(i: number): Ansi_port_declarationContext;
	public ansi_port_declaration(i?: number): Ansi_port_declarationContext | Ansi_port_declarationContext[] {
		if (i === undefined) {
			return this.getRuleContexts(Ansi_port_declarationContext);
		} else {
			return this.getRuleContext(i, Ansi_port_declarationContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_module_declaration; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterModule_declaration) {
			listener.enterModule_declaration(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitModule_declaration) {
			listener.exitModule_declaration(this);
		}
	}
}


export class Module_identifierContext extends ParserRuleContext {
	public IDENTIFIER(): TerminalNode { return this.getToken(VerilogParser.IDENTIFIER, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_module_identifier; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterModule_identifier) {
			listener.enterModule_identifier(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitModule_identifier) {
			listener.exitModule_identifier(this);
		}
	}
}


export class List_of_portsContext extends ParserRuleContext {
	public port(): PortContext[];
	public port(i: number): PortContext;
	public port(i?: number): PortContext | PortContext[] {
		if (i === undefined) {
			return this.getRuleContexts(PortContext);
		} else {
			return this.getRuleContext(i, PortContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_list_of_ports; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterList_of_ports) {
			listener.enterList_of_ports(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitList_of_ports) {
			listener.exitList_of_ports(this);
		}
	}
}


export class PortContext extends ParserRuleContext {
	public port_expression(): Port_expressionContext | undefined {
		return this.tryGetRuleContext(0, Port_expressionContext);
	}
	public port_identifier(): Port_identifierContext | undefined {
		return this.tryGetRuleContext(0, Port_identifierContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_port; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterPort) {
			listener.enterPort(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitPort) {
			listener.exitPort(this);
		}
	}
}


export class Port_expressionContext extends ParserRuleContext {
	public port_reference(): Port_referenceContext[];
	public port_reference(i: number): Port_referenceContext;
	public port_reference(i?: number): Port_referenceContext | Port_referenceContext[] {
		if (i === undefined) {
			return this.getRuleContexts(Port_referenceContext);
		} else {
			return this.getRuleContext(i, Port_referenceContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_port_expression; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterPort_expression) {
			listener.enterPort_expression(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitPort_expression) {
			listener.exitPort_expression(this);
		}
	}
}


export class Port_referenceContext extends ParserRuleContext {
	public port_identifier(): Port_identifierContext {
		return this.getRuleContext(0, Port_identifierContext);
	}
	public constant_range_expression(): Constant_range_expressionContext | undefined {
		return this.tryGetRuleContext(0, Constant_range_expressionContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_port_reference; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterPort_reference) {
			listener.enterPort_reference(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitPort_reference) {
			listener.exitPort_reference(this);
		}
	}
}


export class Port_identifierContext extends ParserRuleContext {
	public IDENTIFIER(): TerminalNode { return this.getToken(VerilogParser.IDENTIFIER, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_port_identifier; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterPort_identifier) {
			listener.enterPort_identifier(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitPort_identifier) {
			listener.exitPort_identifier(this);
		}
	}
}


export class Ansi_port_declarationContext extends ParserRuleContext {
	public input_declaration_ansi(): Input_declaration_ansiContext | undefined {
		return this.tryGetRuleContext(0, Input_declaration_ansiContext);
	}
	public output_declaration_ansi(): Output_declaration_ansiContext | undefined {
		return this.tryGetRuleContext(0, Output_declaration_ansiContext);
	}
	public inout_declaration_ansi(): Inout_declaration_ansiContext | undefined {
		return this.tryGetRuleContext(0, Inout_declaration_ansiContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_ansi_port_declaration; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterAnsi_port_declaration) {
			listener.enterAnsi_port_declaration(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitAnsi_port_declaration) {
			listener.exitAnsi_port_declaration(this);
		}
	}
}


export class Input_declaration_ansiContext extends ParserRuleContext {
	public port_identifier(): Port_identifierContext {
		return this.getRuleContext(0, Port_identifierContext);
	}
	public net_type(): Net_typeContext | undefined {
		return this.tryGetRuleContext(0, Net_typeContext);
	}
	public range(): RangeContext | undefined {
		return this.tryGetRuleContext(0, RangeContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_input_declaration_ansi; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterInput_declaration_ansi) {
			listener.enterInput_declaration_ansi(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitInput_declaration_ansi) {
			listener.exitInput_declaration_ansi(this);
		}
	}
}


export class Output_declaration_ansiContext extends ParserRuleContext {
	public port_identifier(): Port_identifierContext {
		return this.getRuleContext(0, Port_identifierContext);
	}
	public net_type(): Net_typeContext | undefined {
		return this.tryGetRuleContext(0, Net_typeContext);
	}
	public range(): RangeContext | undefined {
		return this.tryGetRuleContext(0, RangeContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_output_declaration_ansi; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterOutput_declaration_ansi) {
			listener.enterOutput_declaration_ansi(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitOutput_declaration_ansi) {
			listener.exitOutput_declaration_ansi(this);
		}
	}
}


export class Inout_declaration_ansiContext extends ParserRuleContext {
	public port_identifier(): Port_identifierContext {
		return this.getRuleContext(0, Port_identifierContext);
	}
	public net_type(): Net_typeContext | undefined {
		return this.tryGetRuleContext(0, Net_typeContext);
	}
	public range(): RangeContext | undefined {
		return this.tryGetRuleContext(0, RangeContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_inout_declaration_ansi; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterInout_declaration_ansi) {
			listener.enterInout_declaration_ansi(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitInout_declaration_ansi) {
			listener.exitInout_declaration_ansi(this);
		}
	}
}


export class Constant_range_expressionContext extends ParserRuleContext {
	public constant_expression(): Constant_expressionContext[];
	public constant_expression(i: number): Constant_expressionContext;
	public constant_expression(i?: number): Constant_expressionContext | Constant_expressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(Constant_expressionContext);
		} else {
			return this.getRuleContext(i, Constant_expressionContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_constant_range_expression; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterConstant_range_expression) {
			listener.enterConstant_range_expression(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitConstant_range_expression) {
			listener.exitConstant_range_expression(this);
		}
	}
}


export class Module_itemContext extends ParserRuleContext {
	public port_declaration(): Port_declarationContext | undefined {
		return this.tryGetRuleContext(0, Port_declarationContext);
	}
	public net_declaration(): Net_declarationContext | undefined {
		return this.tryGetRuleContext(0, Net_declarationContext);
	}
	public reg_declaration(): Reg_declarationContext | undefined {
		return this.tryGetRuleContext(0, Reg_declarationContext);
	}
	public parameter_declaration(): Parameter_declarationContext | undefined {
		return this.tryGetRuleContext(0, Parameter_declarationContext);
	}
	public continuous_assign(): Continuous_assignContext | undefined {
		return this.tryGetRuleContext(0, Continuous_assignContext);
	}
	public initial_construct(): Initial_constructContext | undefined {
		return this.tryGetRuleContext(0, Initial_constructContext);
	}
	public always_construct(): Always_constructContext | undefined {
		return this.tryGetRuleContext(0, Always_constructContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_module_item; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterModule_item) {
			listener.enterModule_item(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitModule_item) {
			listener.exitModule_item(this);
		}
	}
}


export class Port_declarationContext extends ParserRuleContext {
	public input_declaration(): Input_declarationContext | undefined {
		return this.tryGetRuleContext(0, Input_declarationContext);
	}
	public output_declaration(): Output_declarationContext | undefined {
		return this.tryGetRuleContext(0, Output_declarationContext);
	}
	public inout_declaration(): Inout_declarationContext | undefined {
		return this.tryGetRuleContext(0, Inout_declarationContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_port_declaration; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterPort_declaration) {
			listener.enterPort_declaration(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitPort_declaration) {
			listener.exitPort_declaration(this);
		}
	}
}


export class Input_declarationContext extends ParserRuleContext {
	public list_of_port_identifiers(): List_of_port_identifiersContext {
		return this.getRuleContext(0, List_of_port_identifiersContext);
	}
	public net_type(): Net_typeContext | undefined {
		return this.tryGetRuleContext(0, Net_typeContext);
	}
	public range(): RangeContext | undefined {
		return this.tryGetRuleContext(0, RangeContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_input_declaration; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterInput_declaration) {
			listener.enterInput_declaration(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitInput_declaration) {
			listener.exitInput_declaration(this);
		}
	}
}


export class Output_declarationContext extends ParserRuleContext {
	public list_of_port_identifiers(): List_of_port_identifiersContext {
		return this.getRuleContext(0, List_of_port_identifiersContext);
	}
	public net_type(): Net_typeContext | undefined {
		return this.tryGetRuleContext(0, Net_typeContext);
	}
	public range(): RangeContext | undefined {
		return this.tryGetRuleContext(0, RangeContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_output_declaration; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterOutput_declaration) {
			listener.enterOutput_declaration(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitOutput_declaration) {
			listener.exitOutput_declaration(this);
		}
	}
}


export class Inout_declarationContext extends ParserRuleContext {
	public list_of_port_identifiers(): List_of_port_identifiersContext {
		return this.getRuleContext(0, List_of_port_identifiersContext);
	}
	public net_type(): Net_typeContext | undefined {
		return this.tryGetRuleContext(0, Net_typeContext);
	}
	public range(): RangeContext | undefined {
		return this.tryGetRuleContext(0, RangeContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_inout_declaration; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterInout_declaration) {
			listener.enterInout_declaration(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitInout_declaration) {
			listener.exitInout_declaration(this);
		}
	}
}


export class Net_declarationContext extends ParserRuleContext {
	public net_type(): Net_typeContext {
		return this.getRuleContext(0, Net_typeContext);
	}
	public list_of_net_identifiers(): List_of_net_identifiersContext {
		return this.getRuleContext(0, List_of_net_identifiersContext);
	}
	public range(): RangeContext | undefined {
		return this.tryGetRuleContext(0, RangeContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_net_declaration; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterNet_declaration) {
			listener.enterNet_declaration(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitNet_declaration) {
			listener.exitNet_declaration(this);
		}
	}
}


export class Reg_declarationContext extends ParserRuleContext {
	public list_of_register_identifiers(): List_of_register_identifiersContext {
		return this.getRuleContext(0, List_of_register_identifiersContext);
	}
	public range(): RangeContext | undefined {
		return this.tryGetRuleContext(0, RangeContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_reg_declaration; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterReg_declaration) {
			listener.enterReg_declaration(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitReg_declaration) {
			listener.exitReg_declaration(this);
		}
	}
}


export class Net_typeContext extends ParserRuleContext {
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_net_type; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterNet_type) {
			listener.enterNet_type(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitNet_type) {
			listener.exitNet_type(this);
		}
	}
}


export class RangeContext extends ParserRuleContext {
	public constant_expression(): Constant_expressionContext[];
	public constant_expression(i: number): Constant_expressionContext;
	public constant_expression(i?: number): Constant_expressionContext | Constant_expressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(Constant_expressionContext);
		} else {
			return this.getRuleContext(i, Constant_expressionContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_range; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterRange) {
			listener.enterRange(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitRange) {
			listener.exitRange(this);
		}
	}
}


export class List_of_port_identifiersContext extends ParserRuleContext {
	public port_identifier(): Port_identifierContext[];
	public port_identifier(i: number): Port_identifierContext;
	public port_identifier(i?: number): Port_identifierContext | Port_identifierContext[] {
		if (i === undefined) {
			return this.getRuleContexts(Port_identifierContext);
		} else {
			return this.getRuleContext(i, Port_identifierContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_list_of_port_identifiers; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterList_of_port_identifiers) {
			listener.enterList_of_port_identifiers(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitList_of_port_identifiers) {
			listener.exitList_of_port_identifiers(this);
		}
	}
}


export class List_of_net_identifiersContext extends ParserRuleContext {
	public net_identifier(): Net_identifierContext[];
	public net_identifier(i: number): Net_identifierContext;
	public net_identifier(i?: number): Net_identifierContext | Net_identifierContext[] {
		if (i === undefined) {
			return this.getRuleContexts(Net_identifierContext);
		} else {
			return this.getRuleContext(i, Net_identifierContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_list_of_net_identifiers; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterList_of_net_identifiers) {
			listener.enterList_of_net_identifiers(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitList_of_net_identifiers) {
			listener.exitList_of_net_identifiers(this);
		}
	}
}


export class List_of_register_identifiersContext extends ParserRuleContext {
	public register_identifier(): Register_identifierContext[];
	public register_identifier(i: number): Register_identifierContext;
	public register_identifier(i?: number): Register_identifierContext | Register_identifierContext[] {
		if (i === undefined) {
			return this.getRuleContexts(Register_identifierContext);
		} else {
			return this.getRuleContext(i, Register_identifierContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_list_of_register_identifiers; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterList_of_register_identifiers) {
			listener.enterList_of_register_identifiers(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitList_of_register_identifiers) {
			listener.exitList_of_register_identifiers(this);
		}
	}
}


export class Net_identifierContext extends ParserRuleContext {
	public IDENTIFIER(): TerminalNode { return this.getToken(VerilogParser.IDENTIFIER, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_net_identifier; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterNet_identifier) {
			listener.enterNet_identifier(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitNet_identifier) {
			listener.exitNet_identifier(this);
		}
	}
}


export class Register_identifierContext extends ParserRuleContext {
	public IDENTIFIER(): TerminalNode { return this.getToken(VerilogParser.IDENTIFIER, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_register_identifier; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterRegister_identifier) {
			listener.enterRegister_identifier(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitRegister_identifier) {
			listener.exitRegister_identifier(this);
		}
	}
}


export class Parameter_declarationContext extends ParserRuleContext {
	public list_of_param_assignments(): List_of_param_assignmentsContext {
		return this.getRuleContext(0, List_of_param_assignmentsContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_parameter_declaration; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterParameter_declaration) {
			listener.enterParameter_declaration(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitParameter_declaration) {
			listener.exitParameter_declaration(this);
		}
	}
}


export class List_of_param_assignmentsContext extends ParserRuleContext {
	public param_assignment(): Param_assignmentContext[];
	public param_assignment(i: number): Param_assignmentContext;
	public param_assignment(i?: number): Param_assignmentContext | Param_assignmentContext[] {
		if (i === undefined) {
			return this.getRuleContexts(Param_assignmentContext);
		} else {
			return this.getRuleContext(i, Param_assignmentContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_list_of_param_assignments; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterList_of_param_assignments) {
			listener.enterList_of_param_assignments(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitList_of_param_assignments) {
			listener.exitList_of_param_assignments(this);
		}
	}
}


export class Param_assignmentContext extends ParserRuleContext {
	public parameter_identifier(): Parameter_identifierContext {
		return this.getRuleContext(0, Parameter_identifierContext);
	}
	public constant_expression(): Constant_expressionContext {
		return this.getRuleContext(0, Constant_expressionContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_param_assignment; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterParam_assignment) {
			listener.enterParam_assignment(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitParam_assignment) {
			listener.exitParam_assignment(this);
		}
	}
}


export class Parameter_identifierContext extends ParserRuleContext {
	public IDENTIFIER(): TerminalNode { return this.getToken(VerilogParser.IDENTIFIER, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_parameter_identifier; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterParameter_identifier) {
			listener.enterParameter_identifier(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitParameter_identifier) {
			listener.exitParameter_identifier(this);
		}
	}
}


export class Continuous_assignContext extends ParserRuleContext {
	public list_of_net_assignments(): List_of_net_assignmentsContext {
		return this.getRuleContext(0, List_of_net_assignmentsContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_continuous_assign; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterContinuous_assign) {
			listener.enterContinuous_assign(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitContinuous_assign) {
			listener.exitContinuous_assign(this);
		}
	}
}


export class List_of_net_assignmentsContext extends ParserRuleContext {
	public net_assignment(): Net_assignmentContext[];
	public net_assignment(i: number): Net_assignmentContext;
	public net_assignment(i?: number): Net_assignmentContext | Net_assignmentContext[] {
		if (i === undefined) {
			return this.getRuleContexts(Net_assignmentContext);
		} else {
			return this.getRuleContext(i, Net_assignmentContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_list_of_net_assignments; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterList_of_net_assignments) {
			listener.enterList_of_net_assignments(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitList_of_net_assignments) {
			listener.exitList_of_net_assignments(this);
		}
	}
}


export class Net_assignmentContext extends ParserRuleContext {
	public net_lvalue(): Net_lvalueContext {
		return this.getRuleContext(0, Net_lvalueContext);
	}
	public expression(): ExpressionContext {
		return this.getRuleContext(0, ExpressionContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_net_assignment; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterNet_assignment) {
			listener.enterNet_assignment(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitNet_assignment) {
			listener.exitNet_assignment(this);
		}
	}
}


export class Initial_constructContext extends ParserRuleContext {
	public statement(): StatementContext {
		return this.getRuleContext(0, StatementContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_initial_construct; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterInitial_construct) {
			listener.enterInitial_construct(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitInitial_construct) {
			listener.exitInitial_construct(this);
		}
	}
}


export class Always_constructContext extends ParserRuleContext {
	public event_expression(): Event_expressionContext {
		return this.getRuleContext(0, Event_expressionContext);
	}
	public statement(): StatementContext {
		return this.getRuleContext(0, StatementContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_always_construct; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterAlways_construct) {
			listener.enterAlways_construct(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitAlways_construct) {
			listener.exitAlways_construct(this);
		}
	}
}


export class Event_expressionContext extends ParserRuleContext {
	public expression(): ExpressionContext | undefined {
		return this.tryGetRuleContext(0, ExpressionContext);
	}
	public event_expression(): Event_expressionContext[];
	public event_expression(i: number): Event_expressionContext;
	public event_expression(i?: number): Event_expressionContext | Event_expressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(Event_expressionContext);
		} else {
			return this.getRuleContext(i, Event_expressionContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_event_expression; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterEvent_expression) {
			listener.enterEvent_expression(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitEvent_expression) {
			listener.exitEvent_expression(this);
		}
	}
}


export class StatementContext extends ParserRuleContext {
	public blocking_assignment(): Blocking_assignmentContext | undefined {
		return this.tryGetRuleContext(0, Blocking_assignmentContext);
	}
	public non_blocking_assignment(): Non_blocking_assignmentContext | undefined {
		return this.tryGetRuleContext(0, Non_blocking_assignmentContext);
	}
	public seq_block(): Seq_blockContext | undefined {
		return this.tryGetRuleContext(0, Seq_blockContext);
	}
	public conditional_statement(): Conditional_statementContext | undefined {
		return this.tryGetRuleContext(0, Conditional_statementContext);
	}
	public case_statement(): Case_statementContext | undefined {
		return this.tryGetRuleContext(0, Case_statementContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_statement; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterStatement) {
			listener.enterStatement(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitStatement) {
			listener.exitStatement(this);
		}
	}
}


export class Seq_blockContext extends ParserRuleContext {
	public statement(): StatementContext[];
	public statement(i: number): StatementContext;
	public statement(i?: number): StatementContext | StatementContext[] {
		if (i === undefined) {
			return this.getRuleContexts(StatementContext);
		} else {
			return this.getRuleContext(i, StatementContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_seq_block; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterSeq_block) {
			listener.enterSeq_block(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitSeq_block) {
			listener.exitSeq_block(this);
		}
	}
}


export class Blocking_assignmentContext extends ParserRuleContext {
	public variable_lvalue(): Variable_lvalueContext {
		return this.getRuleContext(0, Variable_lvalueContext);
	}
	public expression(): ExpressionContext {
		return this.getRuleContext(0, ExpressionContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_blocking_assignment; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterBlocking_assignment) {
			listener.enterBlocking_assignment(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitBlocking_assignment) {
			listener.exitBlocking_assignment(this);
		}
	}
}


export class Non_blocking_assignmentContext extends ParserRuleContext {
	public variable_lvalue(): Variable_lvalueContext {
		return this.getRuleContext(0, Variable_lvalueContext);
	}
	public expression(): ExpressionContext {
		return this.getRuleContext(0, ExpressionContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_non_blocking_assignment; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterNon_blocking_assignment) {
			listener.enterNon_blocking_assignment(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitNon_blocking_assignment) {
			listener.exitNon_blocking_assignment(this);
		}
	}
}


export class Conditional_statementContext extends ParserRuleContext {
	public expression(): ExpressionContext {
		return this.getRuleContext(0, ExpressionContext);
	}
	public statement(): StatementContext[];
	public statement(i: number): StatementContext;
	public statement(i?: number): StatementContext | StatementContext[] {
		if (i === undefined) {
			return this.getRuleContexts(StatementContext);
		} else {
			return this.getRuleContext(i, StatementContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_conditional_statement; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterConditional_statement) {
			listener.enterConditional_statement(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitConditional_statement) {
			listener.exitConditional_statement(this);
		}
	}
}


export class Case_statementContext extends ParserRuleContext {
	public expression(): ExpressionContext {
		return this.getRuleContext(0, ExpressionContext);
	}
	public case_item(): Case_itemContext[];
	public case_item(i: number): Case_itemContext;
	public case_item(i?: number): Case_itemContext | Case_itemContext[] {
		if (i === undefined) {
			return this.getRuleContexts(Case_itemContext);
		} else {
			return this.getRuleContext(i, Case_itemContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_case_statement; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterCase_statement) {
			listener.enterCase_statement(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitCase_statement) {
			listener.exitCase_statement(this);
		}
	}
}


export class Case_itemContext extends ParserRuleContext {
	public expression(): ExpressionContext[];
	public expression(i: number): ExpressionContext;
	public expression(i?: number): ExpressionContext | ExpressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(ExpressionContext);
		} else {
			return this.getRuleContext(i, ExpressionContext);
		}
	}
	public statement(): StatementContext {
		return this.getRuleContext(0, StatementContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_case_item; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterCase_item) {
			listener.enterCase_item(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitCase_item) {
			listener.exitCase_item(this);
		}
	}
}


export class Net_lvalueContext extends ParserRuleContext {
	public IDENTIFIER(): TerminalNode { return this.getToken(VerilogParser.IDENTIFIER, 0); }
	public expression(): ExpressionContext[];
	public expression(i: number): ExpressionContext;
	public expression(i?: number): ExpressionContext | ExpressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(ExpressionContext);
		} else {
			return this.getRuleContext(i, ExpressionContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_net_lvalue; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterNet_lvalue) {
			listener.enterNet_lvalue(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitNet_lvalue) {
			listener.exitNet_lvalue(this);
		}
	}
}


export class Variable_lvalueContext extends ParserRuleContext {
	public IDENTIFIER(): TerminalNode { return this.getToken(VerilogParser.IDENTIFIER, 0); }
	public expression(): ExpressionContext[];
	public expression(i: number): ExpressionContext;
	public expression(i?: number): ExpressionContext | ExpressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(ExpressionContext);
		} else {
			return this.getRuleContext(i, ExpressionContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_variable_lvalue; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterVariable_lvalue) {
			listener.enterVariable_lvalue(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitVariable_lvalue) {
			listener.exitVariable_lvalue(this);
		}
	}
}


export class Constant_expressionContext extends ParserRuleContext {
	public expression(): ExpressionContext {
		return this.getRuleContext(0, ExpressionContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_constant_expression; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterConstant_expression) {
			listener.enterConstant_expression(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitConstant_expression) {
			listener.exitConstant_expression(this);
		}
	}
}


export class ExpressionContext extends ParserRuleContext {
	public primary(): PrimaryContext | undefined {
		return this.tryGetRuleContext(0, PrimaryContext);
	}
	public unary_operator(): Unary_operatorContext | undefined {
		return this.tryGetRuleContext(0, Unary_operatorContext);
	}
	public expression(): ExpressionContext[];
	public expression(i: number): ExpressionContext;
	public expression(i?: number): ExpressionContext | ExpressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(ExpressionContext);
		} else {
			return this.getRuleContext(i, ExpressionContext);
		}
	}
	public binary_operator(): Binary_operatorContext | undefined {
		return this.tryGetRuleContext(0, Binary_operatorContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_expression; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterExpression) {
			listener.enterExpression(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitExpression) {
			listener.exitExpression(this);
		}
	}
}


export class PrimaryContext extends ParserRuleContext {
	public NUMBER(): TerminalNode | undefined { return this.tryGetToken(VerilogParser.NUMBER, 0); }
	public IDENTIFIER(): TerminalNode | undefined { return this.tryGetToken(VerilogParser.IDENTIFIER, 0); }
	public expression(): ExpressionContext[];
	public expression(i: number): ExpressionContext;
	public expression(i?: number): ExpressionContext | ExpressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(ExpressionContext);
		} else {
			return this.getRuleContext(i, ExpressionContext);
		}
	}
	public concatenation(): ConcatenationContext | undefined {
		return this.tryGetRuleContext(0, ConcatenationContext);
	}
	public multiple_concatenation(): Multiple_concatenationContext | undefined {
		return this.tryGetRuleContext(0, Multiple_concatenationContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_primary; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterPrimary) {
			listener.enterPrimary(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitPrimary) {
			listener.exitPrimary(this);
		}
	}
}


export class ConcatenationContext extends ParserRuleContext {
	public expression(): ExpressionContext[];
	public expression(i: number): ExpressionContext;
	public expression(i?: number): ExpressionContext | ExpressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(ExpressionContext);
		} else {
			return this.getRuleContext(i, ExpressionContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_concatenation; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterConcatenation) {
			listener.enterConcatenation(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitConcatenation) {
			listener.exitConcatenation(this);
		}
	}
}


export class Multiple_concatenationContext extends ParserRuleContext {
	public expression(): ExpressionContext {
		return this.getRuleContext(0, ExpressionContext);
	}
	public concatenation(): ConcatenationContext {
		return this.getRuleContext(0, ConcatenationContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_multiple_concatenation; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterMultiple_concatenation) {
			listener.enterMultiple_concatenation(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitMultiple_concatenation) {
			listener.exitMultiple_concatenation(this);
		}
	}
}


export class Unary_operatorContext extends ParserRuleContext {
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_unary_operator; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterUnary_operator) {
			listener.enterUnary_operator(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitUnary_operator) {
			listener.exitUnary_operator(this);
		}
	}
}


export class Binary_operatorContext extends ParserRuleContext {
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return VerilogParser.RULE_binary_operator; }
	// @Override
	public enterRule(listener: VerilogListener): void {
		if (listener.enterBinary_operator) {
			listener.enterBinary_operator(this);
		}
	}
	// @Override
	public exitRule(listener: VerilogListener): void {
		if (listener.exitBinary_operator) {
			listener.exitBinary_operator(this);
		}
	}
}


