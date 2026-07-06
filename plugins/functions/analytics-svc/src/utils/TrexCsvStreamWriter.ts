import { Transform } from "stream";

type TrexStreamRow = Record<string, unknown>;

type TrexCsvStreamWriterOptions = {
    // Lets callers observe parsed rows, e.g. for audit logging, without coupling this CSV transform to that side effect.
    onRows?: (rows: TrexStreamRow[]) => Promise<void> | void;
};

export default class TrexCsvStreamWriter extends Transform {
    _first = true;

    constructor(private _options: TrexCsvStreamWriterOptions = {}) {
        super();
    }

    override _transform(chunk, _encoding, callback) {
        let csvData = "";
        try {
            const data = JSON.parse(chunk.toString());
            const rows = Array.isArray(data) ? data : [data];
            for (const row of rows) {
                // Use keys of object and add as header if this is the very first row
                if (this._first) {
                    csvData +=
                        Object.keys(row)
                            .map((e) => `"${e}"`) // Wrap each element in double quotes to handle commas in text
                            .join(",") + "\n";
                    this._first = false;
                }

                // Parse data into csv string and add new line at end
                csvData +=
                    Object.values(row)
                        .map((e) => `"${e}"`) // Wrap each element in double quotes to handle commas in text
                        .join(",") + "\n";
            }

            Promise.resolve(this._options.onRows?.(rows))
                .then(() => {
                    this.push(csvData);
                    callback();
                })
                .catch(callback);
        } catch (err) {
            callback(err);
        }
    }
}
