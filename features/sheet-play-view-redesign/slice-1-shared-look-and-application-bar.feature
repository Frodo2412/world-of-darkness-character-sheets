Feature: Shared look and application bar

  Scenario Outline: Every page carries the application bar
    Given a player viewing the <page>
    Then the application bar shows the title "Vampire: The Masquerade" and the ruleset "V20"

    Examples:
      | page    |
      | roster  |
      | builder |
      | sheet   |

  Scenario Outline: The application title leads to the roster
    Given a player viewing the <page>
    When they activate the application title
    Then they are on the roster

    Examples:
      | page    |
      | builder |
      | sheet   |

  Scenario Outline: The design typefaces are loaded from the app itself
    When a player opens the <page>
    Then the Cormorant Garamond and Inter typefaces have finished loading
    And the page title heading is drawn in Cormorant Garamond
    And every request the page made went to the app's own address

    Examples:
      | page    |
      | roster  |
      | builder |
      | sheet   |

  Scenario Outline: The application bar fits a narrow screen
    Given a player viewing the <page> on a 320 pixel wide screen
    Then the page does not scroll sideways
    And the application title is visible

    Examples:
      | page    |
      | roster  |
      | builder |

  Scenario: A page that cannot use storage still shows the application bar
    Given the browser does not allow the app to store data
    When a player opens the roster
    Then the application bar is shown above the storage message
