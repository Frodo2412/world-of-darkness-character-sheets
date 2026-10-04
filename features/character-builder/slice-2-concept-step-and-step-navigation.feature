Feature: Concept step and step navigation

  Scenario: Concept details are kept
    Given a player who has started building a character
    When they enter the concept details
      | field     | text            |
      | Name      | Lucita          |
      | Player    | Ana             |
      | Chronicle | Madrid by Night |
      | Concept   | Fallen noble    |
      | Sire      | Moncada         |
      | Nature    | Rebel           |
      | Demeanor  | Gallant         |
    And they reload the builder
    Then the concept step shows every detail they entered

  Scenario: A concept detail can be cleared
    Given a build named "Lucita"
    When they clear the Name
    And they reload the builder
    Then the Name is empty

  Scenario: The clan choices are the thirteen clans and Caitiff
    Given a player who has started building a character
    When they look at the clan choices
    Then apart from the "Choose a clan" placeholder the choices are exactly
      | Assamite | Brujah | Follower of Set | Gangrel | Giovanni | Lasombra | Malkavian | Nosferatu | Ravnos | Toreador | Tremere | Tzimisce | Ventrue | Caitiff |

  Scenario: A new build has no clan chosen
    Given a player who has started building a character
    When they open the concept step
    Then no clan is chosen

  Scenario: A chosen clan is kept and cannot be cleared
    Given a player who has started building a character
    When they choose the clan "Toreador"
    And they reload the builder
    Then the chosen clan is "Toreador"
    And the "Choose a clan" placeholder can no longer be chosen

  Scenario Outline: Archetypes are suggested but not required
    Given a player who has started building a character
    When they open the concept step
    Then "Architect" and "Visionary" are among the suggestions for <field>
    And entering "Avenger" as the <field> is accepted

    Examples:
      | field    |
      | Nature   |
      | Demeanor |

  Scenario Outline: Any step can be opened from any other
    Given a player on the "<from>" step of a new build
    When they open the "<to>" step from the step navigation
    Then the "<to>" step is shown and marked as the current step
    And keyboard focus is on the "<to>" heading

    Examples:
      | from              | to                |
      | Settings          | Finishing touches |
      | Finishing touches | Concept           |
      | Concept           | Advantages        |
      | Advantages        | Attributes        |
      | Attributes        | Abilities         |
      | Abilities         | Settings          |

  Scenario: Next and Previous walk the steps in order
    Given a player on the "Settings" step of a new build
    When they use Next
    Then the "Concept" step is shown
    And using Previous shows the "Settings" step

  Scenario: The step navigation says what a step still needs
    Given a player who has started building a character
    When they look at the step navigation
    Then the Concept step is marked "clan needed"

  Scenario: A reload returns to the step that was open
    Given a player on the "Concept" step of a new build
    When they reload the builder
    Then the "Concept" step is shown

  Scenario: An unknown step address shows the settings step
    Given a player who has started building a character
    When they open the builder with a step address that does not exist
    Then the "Settings" step is shown

  Scenario: The page title names the step and the build
    Given a build named "Lucita"
    When they open the "Concept" step
    Then the page title is "Concept – Lucita"

  Scenario: The concept step is accessible and fits a phone
    Given a build named "Lucita" of clan "Lasombra"
    When the concept step is checked
    Then no WCAG 2.1 AA violations are reported
    And every control has a unique, non-empty accessible name
    And at 375 pixels wide the page does not scroll horizontally
