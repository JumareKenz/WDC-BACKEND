/**
 * ESLint custom rule: no-untranslated-jsx-text
 *
 * Bans raw string literals inside JSX elements that are not
 * wrapped in a formatting function (t(), formatMessage(), etc.).
 *
 * Allowed:
 *   <span>{t('common.loading')}</span>
 *   <Button label={formatMessage({ id: 'common.save' })} />
 *
 * Banned:
 *   <span>Loading...</span>
 *   <Button label="Save" />
 */

import type { Rule } from 'eslint';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ban untranslated string literals in JSX',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [],
    messages: {
      noUntranslatedText:
        'Untranslated JSX text "{{text}}". Use t("key") or <FormattedMessage id="key" /> instead.',
    },
  },

  create(context: Rule.RuleContext) {
    return {
      JSXText(node: any) {
        const text = node.value.trim();
        if (!text || /^[\d\s\W]+$/.test(text)) return; // ignore numbers/symbols
        context.report({
          node,
          messageId: 'noUntranslatedText',
          data: { text: text.slice(0, 20) },
        });
      },

      JSXAttribute(node: any) {
        if (
          node.value &&
          node.value.type === 'Literal' &&
          typeof node.value.value === 'string' &&
          node.value.value.trim()
        ) {
          const attrName = node.name?.name;
          // Allow certain attributes
          if (['className', 'style', 'id', 'key', 'src', 'href', 'alt'].includes(attrName)) return;
          // Allow aria-label (should still be translated, but often dynamic)
          if (attrName?.startsWith('aria')) return;

          const text = node.value.value.trim();
          if (text.length < 2) return; // ignore single chars

          context.report({
            node: node.value,
            messageId: 'noUntranslatedText',
            data: { text: text.slice(0, 20) },
          });
        }
      },
    };
  },
};

export default rule;
