import { convertZlibBase64ToJson } from "@alp/alp-base-utils";

const encodedStr =
    "eJzdVm1v2jAQ%2FivInwlrwmuQ9iG8qUgrVMD2ZZrQYV9aa8GJbAeVVf3vtT3euqLCwqZV%2B4LC3XPnu%2BeeXPxIYp5olKT9SGgqYn53gxoYaLAWzkibhAFr0kbc8qq%2B3%2FJqQb3hwSIIvDiImzHzQ1bDJimTFUrFU2ECIvJUJhQkU5usGoUm7a%2Bvns1pt6DvTUgGmltHmXChNAiKo3y5sGVd7U3D3gukgCUaQwcUp6WerdhCgWq%2BMvYYEoVloteZBQ1ck11TkwGB1pIvco2%2F1PdtB%2B%2BkaYIgusYFXJgyyiTNbGejnu0N2MrWM%2BNLHGzYE3mSPJ1OMJ6Y%2BNM8VLjxS9tKKlTFIBi3jymluZRojj5ClH%2BcqJOpKv6ey%2B7WPd65S9GltBZssbLPt3e7Ogs3%2BlbKTUfRFmFMBqK0NPPTrzraoPsPmUTlZG8HbI7XqRkF%2BWjfB0hyi7lGkLrEuEJQSM7UyBmwv6TFP67LoOi4grd12flvdBn8E11OE8SsBJlAeE%2BqHI1n55ZzkXgZWmfBNeqCDxdnzxouX5Xvi9%2Bzq1GpNNWTm8lwfhvNu9fRZDafjs1Prz%2BIPn%2BaufvAvVmDs5%2FpDL30OzoiHriaYoKOVze5HTVDe%2FcQH%2BxXfWEmwn%2Fg7j8FjXepXDvIg%2B%2BU8PtxQcG4asG42pG4rboOFkBG09zdb15Er303j%2BXB5Wx34araETgSkU11ztZ9oblef9m86ACtRZ3VW54fXtW9Wgyh1woBvFqd1lkcNht%2B1XyXngFicndH";

const encodedStrWithoutUrlsafe = encodedStr
    .replace(/%2B/g, "+")
    .replace(/%2F/g, "/")
    .replace(/%3D/g, "=");

const decodedJson = convertZlibBase64ToJson(encodedStrWithoutUrlsafe);

console.log(JSON.stringify(decodedJson));
