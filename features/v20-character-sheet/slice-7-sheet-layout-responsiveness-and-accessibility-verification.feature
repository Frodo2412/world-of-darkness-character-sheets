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
      | delete confirmation       |

  Scenario: The whole sheet can be completed from the keyboard
    Given a player viewing a new character's sheet
    When they use only the keyboard to enter a Name, set Strength to 3, mark 2 Blood Pool and mark bashing damage on Bruised
    Then those values are shown
    And keyboard focus was visible at every stop

  Scenario: Every control has a name
    Given a player viewing a character's sheet
    Then every text field, rating, tracker and health box has an accessible name unique within the sheet
