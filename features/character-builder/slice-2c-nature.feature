Feature: Nature and Demeanor

  Scenario: Nature and Demeanor are kept
    Given a player who has started building a character
    When they enter the Nature and Demeanor
      | field    | text    |
      | Nature   | Rebel   |
      | Demeanor | Gallant |
    And they reload the builder
    Then the Nature and Demeanor screen shows every detail they entered

  Scenario Outline: Archetypes are suggested but not required
    Given a player who has started building a character
    When they open the Nature and Demeanor step
    Then "Architect" and "Visionary" are among the suggestions for <field>
    And entering "Avenger" as the <field> is accepted

    Examples:
      | field    |
      | Nature   |
      | Demeanor |
