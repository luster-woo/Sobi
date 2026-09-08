/** 조건부 className 을 합칩니다. false·null·undefined 는 걸러집니다. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
