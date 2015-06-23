import nlf from 'nlf';
import name2url from 'oss-license-name-to-url';

const licenseUrlPrefix = 'http://opensource.org/licenses/';
const npmUrlPrefix = 'https://www.npmjs.com/package/';
const permissiveLicenses = {
  'MIT': true,
  'BSD-2-Clause': true,
  'Apache-2.0': true,
  'wtfplv2': true,
  'ISC': true
};

function url2name(url) {
  return url.split(licenseUrlPrefix)[1];
}

function chooseLicense(licences) {
  for (let i = 0; i < licences.length; i++) {
    let license = licences[i];
    let names = license.license && [license.license] || typeof license.names === 'function' && license.names();

    if (!names) {
      return;
    }

    for (let j = 0; j < names.length; j++) {
      if (names[j]) {
        let url = name2url(names[j]);
        let canonicalName = url2name(url);

        if (permissiveLicenses[canonicalName]) {
          return {
            name: canonicalName,
            url: license.url !== '(none)' && license.url || url
          };
        }
      }
    }
  }
}

export default function (params, modules, callback) {
  try {
    nlf.find(params, function processModules(err, data) {
      if (err) {
        throw err;
      }

      const licences = modules.sort().map(name => data.find(module => module.name === name));
      const result = licences.map(function (module) {
        let sources = module.licenseSources;

        let licensesCount = sources.package.sources.length +
          sources.license.sources.length +
          sources.readme.sources.length;

        if (!licensesCount) {
          throw new Error('No license found for package ' + module.name);
        }

        let license = chooseLicense(sources.package.sources) ||
          chooseLicense(sources.license.sources) ||
          chooseLicense(sources.readme.sources);

        if (!license) {
          throw new Error('No *permissive* license found for package ' + module.name);
        }

        return {
          license: license,
          name: module.name,
          version: module.version,
          url: npmUrlPrefix + module.name
        }
      });

      callback(null, result);
    });
  } catch (e) {
    callback(e);
  }
}

