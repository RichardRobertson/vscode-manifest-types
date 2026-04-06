import { isIdentifierName } from "@babel/helper-validator-identifier";
import { camelCase } from "change-case";

export function translate(
    placeholder: string,
    translations: Record<string, string> | undefined
): string;

export function translate(
    placeholder: string | undefined,
    translations: Record<string, string> | undefined
): undefined;

export function translate(
    placeholder: string | undefined,
    translations: Record<string, string> | undefined
): string | undefined {
    if (
        placeholder !== undefined &&
        translations !== undefined &&
        placeholder.startsWith("%") &&
        placeholder.endsWith("%") &&
        Object.hasOwn(translations, placeholder.slice(1, -1))
    ) {
        return translations[placeholder.slice(1, -1)];
    } else {
        return placeholder;
    }
}

export function toIdentifier(ident: string): string {
    const original = ident;
    if (ident.length === 0) {
        throw new Error("zero length identifier");
    }
    if (isIdentifierName(ident)) {
        return ident;
    }
    ident = camelCase(ident);
    if (isIdentifierName(ident)) {
        return ident;
    }
    // TODO try more things?
    throw new Error(`could not convert "${original}" to identifier`);
}
