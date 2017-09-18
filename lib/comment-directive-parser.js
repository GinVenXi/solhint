

class CommentDirectiveParser {

    constructor (tokens) {
        this.lastLine = tokens.tokenSource.line;
        this.ruleStore = new RuleStore(this.lastLine);

        this.parseComments(tokens);
    }

    parseComments(tokens) {
        const items = tokens.filterForChannel(0, tokens.tokens.length - 1, 1);
        items && items.forEach(this.onComment.bind(this));
    }

    onComment(lexema) {
        const text = lexema.text;
        const curLine = lexema.line;
        const ruleStore = this.ruleStore;

        if (text.includes('solhint-disable-line')) {
            const rules = this.parseRuleIds(text, 'solhint-disable-line');
            ruleStore.disableRules(curLine, rules);
            return;
        }

        if (text.includes('solhint-disable-next-line')) {
            const rules = this.parseRuleIds(text, 'solhint-disable-next-line');

            if (curLine + 1 <= this.lastLine) {
                ruleStore.disableRules(curLine + 1, rules);
            }

            return;
        }

        if (text.includes('solhint-disable')) {
            const rules = this.parseRuleIds(text, 'solhint-disable');

            ruleStore.disableRulesToEndOfFile(curLine, rules);

            return;
        }

        if (text.includes('solhint-enable')) {
            const rules = this.parseRuleIds(text, 'solhint-enable');

            ruleStore.enableRulesToEndOfFile(curLine, rules);
        }
    }

    parseRuleIds(text, start) {
        const ruleIds = text
            .replace('//', '')
            .replace('/*', '')
            .replace('*/', '')
            .replace(start, '');

        const rules = ruleIds
            .split(',')
            .map(curRule => curRule.trim())
            .filter(i => i.length > 0);

        return (rules.length > 0) ? rules : 'all';
    }

    isRuleEnabled(line, ruleId) {
        return this.ruleStore.isRuleEnabled(line, ruleId);
    }

}


class RuleStore {

    constructor (lastLine) {
        this.disableRuleByLine = [];
        this.disableAllByLine = [];
        this.lastLine = lastLine;

        this.initRulesTable();
    }

    initRulesTable() {
        for (let i = 1; i <= this.lastLine; i += 1) {
            this.disableRuleByLine[i] = new Set();
            this.disableAllByLine[i] = false;
        }
    }

    disableRules(curLine, newRules) {
        if (newRules === 'all') {
            this.disableAllByLine[curLine] = true;
        } else {
            const lineRules = this.disableRuleByLine[curLine];
            this.disableRuleByLine[curLine] = new Set([...lineRules, ...newRules]);
        }
    }

    disableRulesToEndOfFile(startLine, rules) {
        for (let i = startLine; i <= this.lastLine; i += 1) {
            this.disableRules(i, rules);
        }
    }

    enableRules(curLine, rules) {
        if (rules === 'all') {
            this.disableAllByLine[curLine] = false;
        } else {
            const lineRules = this.disableRuleByLine[curLine];
            rules.forEach(curRule => lineRules.delete(curRule));
        }
    }

    enableRulesToEndOfFile(startLine, rules) {
        for (let i = startLine; i <= this.lastLine; i += 1) {
            this.enableRules(i, rules);
        }
    }

    isRuleEnabled(line, ruleId) {
        return !this.disableAllByLine[line] && !this.disableRuleByLine[line].has(ruleId);
    }

}

module.exports = CommentDirectiveParser;