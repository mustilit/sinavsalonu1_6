/**
 * Commit mesajı doğrulaması — conventional commits standardı.
 * semantic-release tipleri tanır; aşağıdakiler izinli:
 *   feat, fix, refactor, perf, chore, docs, test, ci, build, style, revert
 *
 * Husky commit-msg hook'una bağlanmak için (opsiyonel):
 *   npx husky add .husky/commit-msg 'npx --no-install commitlint --edit "$1"'
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Subject 100 karakteri aşmasın (uzun açıklama body'de)
    'subject-max-length': [2, 'always', 100],
    'subject-case': [0],
    'scope-empty': [0],
  },
};
