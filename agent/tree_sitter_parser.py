#!/usr/bin/env python
# -*- coding: utf-8 -*-

import ast

from tree_sitter_languages import get_parser

from tree_sitter import Tree
from tree_sitter import Node

supported_languages = [
    'python',
    'java',
    'javascript',
    'typescript',
    'go',
    'rust',
    'kotlin',
    'php',
    'ruby',
    'lua',
    'c',
    'cpp',
    'html',
    'css',
    'sql',
    'json',
    'yaml',
    'toml',
    'bash',
]

def walk_tree(node: Node, depth: int = 0) -> Node:
    if node.type == 'ERROR':
        return node
    
    for child in node.children:
        result = walk_tree(child, depth + 1)
        if result:
            return result
    return None

def check_code(language: str, code: str) -> str:
    language = language.lower()
    if language not in supported_languages:
        return "language not supported"

    try:
        tree = get_parser(language).parse(code.encode('utf-8'))
    except Exception as exc:
        if language == "python":
            try:
                ast.parse(code)
            except SyntaxError as syntax_error:
                return f"code compile error at line {syntax_error.lineno}, column {syntax_error.offset}: {syntax_error.msg}"
            return "code compile success"
        return f"code parser unavailable: {exc}"

    result = walk_tree(tree.root_node)
    if result:
        return "code compile error at " + str(result.start_point) + " to " + str(result.end_point) + ",\n the error text is: \"" + str(result.text) + "\""
    return "code compile success"


if __name__ == '__main__':
    code = '''
    def hello_world():
        print("Hello, World!")
                                      
    def hello_world2():::::
        print("Hello, World2!")
'''
    print(check_code('python', code))
