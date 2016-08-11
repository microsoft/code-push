const possibleStringChars: string = "abcdefghijklmnopqrstuvwxyz";
export function makeRandomString(length: number = 10): string {
    var randomString: string = "";
    
    for (var i: number = 0; i < length; i++) {
        randomString += possibleStringChars.charAt(Math.floor(Math.random() * possibleStringChars.length));
    }
    
    return randomString;
}