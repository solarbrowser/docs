# ECMA Compliance

Quanta, Solar's JavaScript engine, is designed to provide robust ECMAScript compliance while maintaining high performance. We continuously test Quanta against the official Test262 suite to ensure standards conformance and track our progress toward full ECMAScript support.

## ECMAScript Compatibility

Quanta has been tested against the official **Test262** ECMAScript test suite (51,216 tests). Results demonstrate strong foundational JavaScript support with ongoing development for advanced features.

### Test262 Compliance Results

**Last Test Date:** December 18, 2025 | **Engine Version:** q120525c153l

| Metric | Count | % of Total | % of Executed |
|--------|-------:|-----------:|---------------:|
| **Total Tests** | 51,216 | 100.0% | - |
| **Tests Run** | 35,697 | 69.7% | 100.00% |
| **Passed** | 13,427 | 26.22% | **37.61%** |
| **Failed** | 22,270 | 43.48% | 65.93% |
| **Skipped** | 15,519 | 30.3% | - |

**[View Detailed & Other Test Results →](https://github.com/solarbrowser/quanta/blob/main/docs/documents/test262-results.md)**

## Understanding the Results

Quanta is actively under development, and these results reflect our current progress. The 37.61% pass rate on executed tests demonstrates solid foundational JavaScript support, with ongoing work to expand coverage of advanced ECMAScript features.

- **Tests Run**: Core JavaScript features that Quanta currently implements
- **Passed**: Features fully compliant with ECMAScript standards
- **Failed**: Features under active development or requiring optimization
- **Skipped**: Advanced features not yet implemented

## Testing Infrastructure

We use a specialized test runner script to evaluate Quanta's compliance with the Test262 suite. This script allows us to:

- Run comprehensive ECMAScript conformance tests
- Track progress over time
- Identify areas requiring attention
- Ensure standards compliance

Our testing infrastructure is being polished and will be made available in the Quanta GitHub repository, allowing the community to run tests and verify compliance independently.

## Our Commitment

Solar and Quanta are committed to full ECMAScript compliance. As development progresses, we will continue to expand test coverage, improve pass rates, and maintain transparency about our standards conformance.

Stay tuned for regular updates on our Test262 compliance progress.
