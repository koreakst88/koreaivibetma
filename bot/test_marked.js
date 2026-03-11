import { marked } from 'marked';

const renderer = {
    heading(token) {
        const text = typeof token === 'object' ? token.text : arguments[0];
        const depth = typeof token === 'object' ? token.depth : arguments[1];

        const plainText = text.replace(/<[^>]+>/g, '');
        const id = plainText.toLowerCase()
            .replace(/[^\wа-яА-ЯёЁa-zA-Z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        return `<h${depth} id="${id}">${text}</h${depth}>`;
    }
};

marked.use({ renderer });

console.log(marked.parse("## Обзор Дня"));
