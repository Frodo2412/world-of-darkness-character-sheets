Feature: Layout and accessibility

  Scenario Outline: Usable on a phone
    Given a player viewing the <page> on a 375 pixel wide screen
    Then the page does not scroll sideways
    And every control offered in play mode is visible and can be activated

    Examples:
      | page   |
      | roster |
      | sheet  |

  Scenario Outline: No automated accessibility violations
    Given a player viewing the <page>
    When the page is checked against WCAG 2.1 AA
    Then no violations are reported

    Examples:
      | page                      |
      | empty roster              |
      | roster with characters    |
      | sheet                     |
      | character not found       |
